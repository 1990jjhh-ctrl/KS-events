/**
 * Pure optimizer functions for the Buccaneer Bounty event.
 * No React imports. All inputs are plain data.
 */

export function evForChest(chestTypeId, targetItemId, rewardTables) {
  const table = rewardTables[chestTypeId];
  if (!table) return 0;
  return table
    .filter((row) => row.itemId === targetItemId)
    .reduce((sum, row) => sum + row.prob * row.qty, 0);
}

export function evRerollExpected(targetItemId, data) {
  const { chestTypes, rewardTables } = data;
  return chestTypes.reduce((sum, ct) => {
    return sum + (ct.spawnWeight / 100) * evForChest(ct.id, targetItemId, rewardTables);
  }, 0);
}

export function scoreSlots(slots, targetItemId, rewardTables) {
  return slots
    .map((chestTypeId, idx) => ({
      slotIndex: idx,
      chestTypeId,
      ev: evForChest(chestTypeId, targetItemId, rewardTables),
    }))
    .sort((a, b) => b.ev - a.ev || a.slotIndex - b.slotIndex);
}

export function recommendedOpens(rankedSlots, keyBudget, keyCostPerChest) {
  let keysLeft = keyBudget;
  const indices = [];
  for (const slot of rankedSlots) {
    if (keysLeft < keyCostPerChest) break;
    indices.push(slot.slotIndex);
    keysLeft -= keyCostPerChest;
  }
  return indices;
}

export function rerollDecision(rankedSlots, keyBudget, freeRerollsRemaining, targetItemId, data) {
  const { meta } = data;
  const evNextBest = rankedSlots[0]?.ev ?? 0;
  const evAvg = evRerollExpected(targetItemId, data);
  const effectiveRerollCost = freeRerollsRemaining > 0 ? 0 : meta.rerollCost;
  const canAffordReroll = keyBudget >= effectiveRerollCost + meta.keyCostPerChest;
  const shouldReroll = canAffordReroll && evNextBest < evAvg;

  const bestChestLabel = data.chestTypes.find((ct) => ct.id === rankedSlots[0]?.chestTypeId)?.label ?? 'Unknown';
  const freeTag = freeRerollsRemaining > 0 ? ' (free reroll available)' : '';
  const reasoning = shouldReroll
    ? `Your best chest (${bestChestLabel}, EV ${evNextBest.toFixed(3)}) is below the average new chest (EV ${evAvg.toFixed(3)}) — reroll${freeTag}.`
    : canAffordReroll
    ? `Your best chest (${bestChestLabel}, EV ${evNextBest.toFixed(3)}) beats the average new chest (EV ${evAvg.toFixed(3)}) — open it.`
    : `Not enough keys to reroll (need ${effectiveRerollCost + meta.keyCostPerChest}, have ${keyBudget}).`;

  return { shouldReroll, evNextBest, evRerollSingleChest: evAvg, effectiveRerollCost, reasoning };
}

export function projectYield(config) {
  const { slots, targetItemId, keyBudget, freeRerollsRemaining, data } = config;
  const { meta } = data;
  const K = meta.keyCostPerChest; // 60
  const R = meta.rerollCost;      // 90

  const evAvgSlot = evRerollExpected(targetItemId, data);

  let keysLeft = keyBudget;
  let totalYield = 0;
  let boardsPlayed = 0;
  let freeRerollsUsed = 0;
  let paidRerollsUsed = 0;
  let freeRerolls = freeRerollsRemaining;

  // Phase 1: first board — known chest types.
  // Open only slots whose EV beats the expected value of a fresh random slot.
  const ranked = scoreSlots(slots, targetItemId, data.rewardTables);
  let firstBoardOpened = 0;
  for (const slot of ranked) {
    if (slot.ev < evAvgSlot) break; // sorted desc, so all remaining are also below
    if (keysLeft < K) break;
    totalYield += slot.ev;
    keysLeft -= K;
    firstBoardOpened++;
  }

  const firstBoardComplete = firstBoardOpened === slots.length;

  if (firstBoardComplete) {
    // Opened all 9 → free auto-refresh, move to random boards
    boardsPlayed++;
  } else {
    // Some (or all) slots skipped — reroll if affordable
    const rerollCost = freeRerolls > 0 ? 0 : R;
    if (keysLeft >= rerollCost + K) {
      keysLeft -= rerollCost;
      if (freeRerolls > 0) { freeRerolls--; freeRerollsUsed++; }
      else paidRerollsUsed++;
      boardsPlayed++;
    } else {
      // Can't afford to reroll or open anything new — done
      return { totalExpectedYield: totalYield, keysSpent: keyBudget - keysLeft, boardsPlayed, freeRerollsUsed, paidRerollsUsed };
    }
  }

  // Phase 2: random boards.
  // Every slot has EV = evAvgSlot (weighted average across chest types).
  // Optimal play: open all 9 each board (no reroll threshold to beat), collect free refresh.
  // Each full board costs 9×K = 540 keys and yields 9×evAvgSlot.
  while (keysLeft >= K) {
    const chestsThisBoard = Math.min(meta.chestSlots, Math.floor(keysLeft / K));
    totalYield += chestsThisBoard * evAvgSlot;
    keysLeft -= chestsThisBoard * K;
    boardsPlayed++;
    if (chestsThisBoard < meta.chestSlots) break; // partial last board — done
    // Full board → free refresh, loop again
  }

  return {
    totalExpectedYield: totalYield,
    keysSpent: keyBudget - keysLeft,
    boardsPlayed,
    freeRerollsUsed,
    paidRerollsUsed,
  };
}

export function runOptimizer(config) {
  const { slots, targetItemId, keyBudget, freeRerollsRemaining, data } = config;
  const { meta, chestTypes, rewardTables } = data;

  const rankedSlots = scoreSlots(slots, targetItemId, rewardTables).map((s) => {
    const ct = chestTypes.find((c) => c.id === s.chestTypeId);
    return { ...s, label: ct?.label ?? s.chestTypeId, colorClass: ct?.colorClass ?? '' };
  });

  const evByChestType = {};
  for (const ct of chestTypes) {
    evByChestType[ct.id] = evForChest(ct.id, targetItemId, rewardTables);
  }

  const advice = rerollDecision(rankedSlots, keyBudget, freeRerollsRemaining, targetItemId, data);

  // Glow set:
  // - REROLL advised → nothing glows (you should reroll, not open)
  // - OPEN with above-threshold slots → glow those (within budget)
  // - OPEN with no above-threshold slots (can't afford reroll) → glow top-N within budget
  let recommendedSlotIndices;
  if (advice.shouldReroll) {
    recommendedSlotIndices = new Set();
  } else {
    const aboveThreshold = rankedSlots.filter((s) => s.ev >= advice.evRerollSingleChest);
    const candidates = aboveThreshold.length > 0 ? aboveThreshold : rankedSlots;
    const indices = recommendedOpens(candidates, keyBudget, meta.keyCostPerChest);
    recommendedSlotIndices = new Set(indices);
  }

  const totalEVIfOpenAll = rankedSlots.reduce((s, r) => s + r.ev, 0);
  const totalEVIfOpenRecommended = rankedSlots
    .filter((r) => recommendedSlotIndices.has(r.slotIndex))
    .reduce((s, r) => s + r.ev, 0);

  const projection = projectYield({ slots, targetItemId, keyBudget, freeRerollsRemaining, data });

  return {
    rankedSlots,
    recommendedSlotIndices,
    evByChestType,
    rerollAdvice: advice,
    totalEVIfOpenAll,
    totalEVIfOpenRecommended,
    projection,
  };
}
