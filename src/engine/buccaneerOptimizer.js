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

/**
 * Try all 7 non-empty subsets of chest types and return the one with the
 * highest expected yield per key.
 *
 * Insight: opening only high-EV chest types and manually rerolling past the
 * rest can beat opening every chest, because the reroll cost is amortised over
 * fewer but higher-value opens. This matches the script's subset-selection logic.
 *
 * When ALL types are selected you open every chest → free auto-refresh after
 * each board → 0 reroll fee. Any strict subset requires a paid manual reroll
 * (90 keys) after each board.
 */
export function optimizeStrategy(targetItemId, data) {
  const { chestTypes, rewardTables, meta } = data;
  const n = chestTypes.length;
  let best = null;

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = chestTypes.filter((_, i) => mask & (1 << i));
    const totalWeight = subset.reduce((s, ct) => s + ct.spawnWeight / 100, 0);
    if (totalWeight === 0) continue;

    const weightedEV = subset.reduce(
      (s, ct) => s + (ct.spawnWeight / 100) * evForChest(ct.id, targetItemId, rewardTables),
      0
    );
    const evPerSelectedChest = weightedEV / totalWeight;
    const chestsPerBoard = meta.chestSlots * totalWeight;
    const isAllTypes = subset.length === n;
    const rerollCost = isAllTypes ? 0 : meta.rerollCost;
    const keysPerBoard = chestsPerBoard * meta.keyCostPerChest + rerollCost;
    const yieldPerBoard = chestsPerBoard * evPerSelectedChest; // = weightedEV * chestSlots
    const yieldPerKey = keysPerBoard > 0 ? yieldPerBoard / keysPerBoard : 0;

    if (best === null || yieldPerKey > best.yieldPerKey) {
      best = {
        subsetIds: new Set(subset.map((ct) => ct.id)),
        subsetLabels: subset.map((ct) => ct.label),
        evPerSelectedChest,
        chestsPerBoard,
        rerollCost,
        keysPerBoard,
        yieldPerBoard,
        yieldPerKey,
      };
    }
  }

  return best;
}

/**
 * Forward projection: given a key budget, how many items do we expect?
 *
 * Free rerolls are spent first (they reduce per-board cost from keysPerBoard to
 * chestsPerBoard×60 for those boards). After free rerolls are exhausted the
 * remaining keys are spent at the normal rate.
 */
export function projectForward(keyBudget, targetItemId, freeRerollsRemaining, data) {
  const strat = optimizeStrategy(targetItemId, data);
  if (!strat || strat.keysPerBoard === 0) return { expectedYield: 0, strategy: strat };

  const freeBoardCost = strat.chestsPerBoard * data.meta.keyCostPerChest;
  let keysLeft = keyBudget;
  let totalYield = 0;

  if (strat.rerollCost > 0 && freeRerollsRemaining > 0) {
    const freeBoardsAffordable = Math.min(
      freeRerollsRemaining,
      Math.floor(keysLeft / freeBoardCost)
    );
    totalYield += freeBoardsAffordable * strat.yieldPerBoard;
    keysLeft -= freeBoardsAffordable * freeBoardCost;
  }

  // Remaining keys at the normal (paid-reroll) rate
  totalYield += (keysLeft / strat.keysPerBoard) * strat.yieldPerBoard;

  return { expectedYield: totalYield, strategy: strat };
}

/**
 * Backward projection: given a target quantity, how many keys are needed?
 *
 * Uses ceil-based formula matching the Python script, with a one-board
 * correction (first board is free — no reroll fee) and free-reroll savings.
 */
export function projectBackward(targetQty, targetItemId, freeRerollsRemaining, data) {
  const strat = optimizeStrategy(targetItemId, data);
  if (!strat || strat.evPerSelectedChest === 0) {
    return { keysNeeded: Infinity, numChests: Infinity, numBoards: Infinity, freeRerollSavings: 0, strategy: strat };
  }

  const numChests = Math.ceil(targetQty / strat.evPerSelectedChest);
  const numBoards = strat.chestsPerBoard > 0
    ? Math.ceil(numChests / strat.chestsPerBoard)
    : Infinity;

  const keysForChests = numChests * data.meta.keyCostPerChest;
  // First board is free; the remaining (numBoards-1) each cost a reroll fee
  const rerollsNeeded = Math.max(0, numBoards - 1);
  const freeRerollSavings = strat.rerollCost > 0
    ? Math.min(rerollsNeeded, freeRerollsRemaining) * data.meta.rerollCost
    : 0;
  const keysForRerolls = rerollsNeeded * strat.rerollCost;
  const keysNeeded = Math.max(0, keysForChests + keysForRerolls - freeRerollSavings);

  return { keysNeeded, numChests, numBoards, freeRerollSavings, strategy: strat };
}

export function rerollDecision(rankedSlots, keyBudget, freeRerollsRemaining, targetItemId, data) {
  const { meta } = data;
  const strat = optimizeStrategy(targetItemId, data);
  const effectiveRerollCost = freeRerollsRemaining > 0 ? 0 : meta.rerollCost;
  const canAffordReroll = keyBudget >= effectiveRerollCost + meta.keyCostPerChest;

  const bestVisible = rankedSlots.find((s) => strat.subsetIds.has(s.chestTypeId));
  const shouldReroll = canAffordReroll && !bestVisible;

  const subsetStr = strat.subsetLabels.join(' + ');
  const freeTag = freeRerollsRemaining > 0 ? ' (free)' : '';
  const reasoning = shouldReroll
    ? `No ${subsetStr} visible — reroll${freeTag}.`
    : bestVisible
    ? `${bestVisible.label} in slot ${bestVisible.slotIndex + 1} is worth opening (EV ${bestVisible.ev.toFixed(3)}).`
    : `No ${subsetStr} visible and cannot afford to reroll with ${keyBudget} keys.`;

  return { shouldReroll, effectiveRerollCost, reasoning, strategy: strat };
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

  // Glow set: visible chests whose type belongs to the optimal subset, within budget.
  // Nothing glows when REROLL is advised.
  let recommendedSlotIndices;
  if (advice.shouldReroll) {
    recommendedSlotIndices = new Set();
  } else {
    const openable = rankedSlots.filter((s) => advice.strategy.subsetIds.has(s.chestTypeId));
    const indices = recommendedOpens(openable, keyBudget, meta.keyCostPerChest);
    recommendedSlotIndices = new Set(indices);
  }

  const totalEVIfOpenAll = rankedSlots.reduce((s, r) => s + r.ev, 0);
  const totalEVIfOpenRecommended = rankedSlots
    .filter((r) => recommendedSlotIndices.has(r.slotIndex))
    .reduce((s, r) => s + r.ev, 0);

  return {
    rankedSlots,
    recommendedSlotIndices,
    evByChestType,
    rerollAdvice: advice,
    totalEVIfOpenAll,
    totalEVIfOpenRecommended,
  };
}
