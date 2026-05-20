import { useState, useMemo } from 'react';
import data from '../../data/buccaneer-bounty.json';
import { runOptimizer, projectForward, projectBackward } from '../../engine/buccaneerOptimizer.js';
import Header from '../shared/Header.jsx';
import ChestGrid from './ChestGrid.jsx';
import TargetSelector from './TargetSelector.jsx';
import KeyBudgetInput from './KeyBudgetInput.jsx';
import RecommendationPanel from './RecommendationPanel.jsx';
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

  return (
    <div className="buccaopt">
      <Header />
      <main className="buccaopt__main">
        <div className="buccaopt__left">
          <TargetSelector
            rewardItems={data.rewardItems}
            targetItemId={targetItemId}
            onChange={setTargetItemId}
          />
          <KeyBudgetInput
            keyBudget={keyBudget}
            freeRerollsRemaining={freeRerollsRemaining}
            onKeyBudgetChange={setKeyBudget}
            onFreeRerollsChange={setFreeRerollsRemaining}
          />
          <ChestGrid
            slots={slots}
            chestTypes={data.chestTypes}
            rankedSlots={result.rankedSlots}
            recommendedSlotIndices={result.recommendedSlotIndices}
            targetLabel={targetLabel}
            onSlotChange={handleSlotChange}
          />
        </div>
        <div className="buccaopt__right">
          <RecommendationPanel
            result={result}
            chestTypes={data.chestTypes}
            rewardItems={data.rewardItems}
            targetItemId={targetItemId}
            keyBudget={keyBudget}
            freeRerollsRemaining={freeRerollsRemaining}
            forwardResult={forwardResult}
            backwardResult={backwardResult}
            targetQty={targetQty}
            onTargetQtyChange={setTargetQty}
          />
        </div>
      </main>
    </div>
  );
}
