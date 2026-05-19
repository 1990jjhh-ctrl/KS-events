import { useState, useMemo } from 'react';
import data from '../../data/buccaneer-bounty.json';
import { runOptimizer } from '../../engine/buccaneerOptimizer.js';
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
          />
        </div>
      </main>
    </div>
  );
}
