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

  let keysLeft = keyBudget;
  let totalYield = 0;
  let boardsPlayed = 0;
  let freeRerollsUsed = 0;
  let paidRerollsUsed = 0;
  let freeRerolls = freeRerollsRemaining;

  const evAvgSlot = evRerollExpected(targetItemId, data);

  // First board: use the actual known slots
  let currentBoard = [...slots];
  let isFirstBoard = true;

  // Safety cap to prevent infinite loops
  const MAX_BOARDS = 200;

  while (keysLeft >= meta.keyCostPerChest && boardsPlayed < MAX_BOARDS) {
    const ranked = scoreSlots(currentBoard, targetItemId, data.rewardTables);
    const rerollCost = freeRerolls > 0 ? 0 : meta.rerollCost;

    // Determine which chests to open: those with EV > evAvgSlot (worth opening before rerolling)
    // On the first board, we may have chests below evAvgSlot that we skip in favour of rerolling.
    // On random boards every slot has EV = evAvgSlot so we open all 9.
    const openList = isFirstBoard
      ? ranked.filter((s) => s.ev >= evAvgSlot)
      : ranked; // all slots equal evAvgSlot on a random board

    if (openList.length === 0) break;

    // Open the eligible chests
    let openedCount = 0;
    for (const slot of openList) {
      if (keysLeft < meta.keyCostPerChest) break;
      totalYield += slot.ev;
      keysLeft -= meta.keyCostPerChest;
      openedCount++;
    }

    if (openedCount === 0) break;

    const openedAll = openedCount === currentBoard.length;

    if (openedAll) {
      // Free auto-refresh
      boardsPlayed++;
      // Next board is random
      currentBoard = Array(meta.chestSlots).fill('__avg__');
      isFirstBoard = false;
    } else if (keysLeft >= rerollCost + meta.keyCostPerChest) {
      // Manual reroll
      keysLeft -= rerollCost;
      if (freeRerolls > 0) {
        freeRerolls--;
        freeRerollsUsed++;
      } else {
        paidRerollsUsed++;
      }
      boardsPlayed++;
      currentBoard = Array(meta.chestSlots).fill('__avg__');
      isFirstBoard = false;
    } else {
      break;
    }
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

  const recommendedIndices = recommendedOpens(rankedSlots, keyBudget, meta.keyCostPerChest);
  const recommendedSlotIndices = new Set(recommendedIndices);

  const evByChestType = {};
  for (const ct of chestTypes) {
    evByChestType[ct.id] = evForChest(ct.id, targetItemId, rewardTables);
  }

  const advice = rerollDecision(rankedSlots, keyBudget, freeRerollsRemaining, targetItemId, data);

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
