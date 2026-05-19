import './TargetSelector.css';

export default function TargetSelector({ rewardItems, targetItemId, onChange }) {
  return (
    <div className="target-selector">
      <span className="target-selector__label">Target reward:</span>
      <div className="target-selector__pills" role="group" aria-label="Select target reward">
        {rewardItems.map((item) => (
          <button
            key={item.id}
            className={`target-pill ${targetItemId === item.id ? 'target-pill--active' : ''}`}
            onClick={() => onChange(item.id)}
            aria-pressed={targetItemId === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
