import { useState, useMemo } from 'react';
import data from '../../data/buccaneer-bounty.json';
import { runOptimizer, projectForward, projectBackward } from '../../engine/buccaneerOptimizer.js';
import Header from '../shared/Header.jsx';
import ChestGrid from './ChestGrid.jsx';
import TargetSelector from './TargetSelector.jsx';
import KeyBudgetInput from './KeyBudgetInput.jsx';
import { EVTablePanel, RankedSlotsPanel, AdvicePanel, ProjectionPanel } from './RecommendationPanel.jsx';
import './BuccaOptimizer.css';

const DEFAULT_SLOTS = Array(data.meta.chestSlots).fill('common');

export default function BuccaOptimizer() {
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [targetItemId, setTargetItemId] = useState('pearl');
  const [keyBudget, setKeyBudget] = useState(540);
  const [freeRerollsRemaining, setFreeRerollsRemaining] = useState(data.meta.freeDailyRerolls);
  const [targetQty, setTargetQty] = useState(0);

  function handleSlotChange(index, chestTypeId) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = chestTypeId;
      return next;
    });
  }

  const result = useMemo(
    () => runOptimizer({ slots, targetItemId, keyBudget, freeRerollsRemaining, data }),
    [slots, targetItemId, keyBudget, freeRerollsRemaining]
  );

  const forwardResult = useMemo(
    () => projectForward(keyBudget, targetItemId, freeRerollsRemaining, data),
    [keyBudget, targetItemId, freeRerollsRemaining]
  );

  const backwardResult = useMemo(
    () => targetQty > 0 ? projectBackward(targetQty, targetItemId, freeRerollsRemaining, data) : null,
    [targetQty, targetItemId, freeRerollsRemaining]
  );

  const targetLabel = data.rewardItems.find((r) => r.id === targetItemId)?.label ?? targetItemId;
  const strategy = result.rerollAdvice.strategy;

  return (
    <div className="buccaopt">
      <Header />
      <main className="buccaopt__main">
        {/* JSX order = mobile single-column order; desktop rearranges via grid-template-areas */}

        <div className="area-target">
          <TargetSelector
            rewardItems={data.rewardItems}
            targetItemId={targetItemId}
            onChange={setTargetItemId}
          />
          <AdvicePanel
            rerollAdvice={result.rerollAdvice}
          />
        </div>

        <KeyBudgetInput
          className="area-budget"
          keyBudget={keyBudget}
          freeRerollsRemaining={freeRerollsRemaining}
          onKeyBudgetChange={setKeyBudget}
          onFreeRerollsChange={setFreeRerollsRemaining}
        />

        <ChestGrid
          className="area-chests"
          slots={slots}
          chestTypes={data.chestTypes}
          rankedSlots={result.rankedSlots}
          recommendedSlotIndices={result.recommendedSlotIndices}
          targetLabel={targetLabel}
          onSlotChange={handleSlotChange}
        />

        <ProjectionPanel
          className="area-proj"
          forwardResult={forwardResult}
          backwardResult={backwardResult}
          targetQty={targetQty}
          onTargetQtyChange={setTargetQty}
          keyBudget={keyBudget}
          freeRerollsRemaining={freeRerollsRemaining}
          targetLabel={targetLabel}
          strategy={strategy}
        />

        <EVTablePanel
          className="area-ev"
          chestTypes={data.chestTypes}
          evByChestType={result.evByChestType}
          strategy={strategy}
          targetLabel={targetLabel}
        />

        <RankedSlotsPanel
          className="area-ranked"
          rankedSlots={result.rankedSlots}
          recommendedSlotIndices={result.recommendedSlotIndices}
        />
      </main>
    </div>
  );
}
