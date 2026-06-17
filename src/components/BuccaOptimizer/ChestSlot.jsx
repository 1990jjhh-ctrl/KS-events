import EVBadge from '../shared/EVBadge.jsx';
import './ChestSlot.css';

export default function ChestSlot({ index, chestTypeId, chestTypes, ev, isRecommended, rank, targetLabel, onChange }) {
  const colorClass = chestTypes.find((ct) => ct.id === chestTypeId)?.colorClass ?? '';

  return (
    <div className={`chest-slot ${colorClass} ${isRecommended ? 'chest--recommended' : ''}`}>
      <div className="chest-slot__rank">{rank}</div>
      <select
        className="chest-slot__select"
        value={chestTypeId}
        onChange={(e) => onChange(index, e.target.value)}
        aria-label={`Slot ${index + 1} chest type`}
      >
        {chestTypes.map((ct) => (
          <option key={ct.id} value={ct.id}>{ct.label}</option>
        ))}
      </select>
      <EVBadge ev={ev} targetLabel={targetLabel} />
      {isRecommended && <span className="chest-slot__check" aria-label="Recommended">✓</span>}
    </div>
  );
}
