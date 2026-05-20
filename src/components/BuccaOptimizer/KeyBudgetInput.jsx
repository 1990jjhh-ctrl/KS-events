import './KeyBudgetInput.css';

const MAX_FREE_REROLLS = 3;

export default function KeyBudgetInput({ keyBudget, freeRerollsRemaining, onKeyBudgetChange, onFreeRerollsChange, className = '' }) {
  function handleBudgetInput(e) {
    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
    onKeyBudgetChange(val);
  }

  function handleQuickAdd(amount) {
    onKeyBudgetChange(keyBudget + amount);
  }

  return (
    <div className={`key-budget-input ${className}`}>
      <div className="key-budget-input__row">
        <label className="key-budget-input__label" htmlFor="key-budget">
          Key budget
        </label>
        <div className="key-budget-input__controls">
          <input
            id="key-budget"
            type="number"
            min="0"
            step="60"
            value={keyBudget}
            onChange={handleBudgetInput}
            className="key-budget-input__field"
            aria-label="Available Corsair Keys"
          />
          <button
            className="key-budget-input__quick"
            onClick={() => handleQuickAdd(540)}
            title="Add 540 keys (one full board)"
          >
            +540
          </button>
          <button
            className="key-budget-input__quick"
            onClick={() => handleQuickAdd(60)}
            title="Add 60 keys (one chest)"
          >
            +60
          </button>
        </div>
      </div>

      <div className="key-budget-input__row">
        <label className="key-budget-input__label">
          Free rerolls left today
        </label>
        <div className="key-budget-input__stepper" role="group" aria-label="Free rerolls remaining">
          <button
            className="stepper-btn"
            onClick={() => onFreeRerollsChange(Math.max(0, freeRerollsRemaining - 1))}
            disabled={freeRerollsRemaining === 0}
            aria-label="Decrease free rerolls"
          >
            −
          </button>
          <span className="stepper-value" aria-live="polite">{freeRerollsRemaining}</span>
          <button
            className="stepper-btn"
            onClick={() => onFreeRerollsChange(Math.min(MAX_FREE_REROLLS, freeRerollsRemaining + 1))}
            disabled={freeRerollsRemaining === MAX_FREE_REROLLS}
            aria-label="Increase free rerolls"
          >
            +
          </button>
          <span className="stepper-hint">/ {MAX_FREE_REROLLS} daily</span>
        </div>
      </div>
    </div>
  );
}
