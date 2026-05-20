import ChestSlot from './ChestSlot.jsx';
import './ChestGrid.css';

export default function ChestGrid({ slots, chestTypes, rankedSlots, recommendedSlotIndices, targetLabel, onSlotChange, className = '' }) {
  // Build a map from slotIndex → rank (1-based)
  const rankMap = {};
  rankedSlots.forEach((s, i) => { rankMap[s.slotIndex] = i + 1; });

  // Build a map from slotIndex → ev
  const evMap = {};
  rankedSlots.forEach((s) => { evMap[s.slotIndex] = s.ev; });

  return (
    <div className={`chest-grid ${className}`} role="grid" aria-label="Chest slots 3×3 grid">
      {slots.map((chestTypeId, idx) => (
        <ChestSlot
          key={idx}
          index={idx}
          chestTypeId={chestTypeId}
          chestTypes={chestTypes}
          ev={evMap[idx] ?? 0}
          isRecommended={recommendedSlotIndices.has(idx)}
          rank={rankMap[idx] ?? '—'}
          targetLabel={targetLabel}
          onChange={onSlotChange}
        />
      ))}
    </div>
  );
}
