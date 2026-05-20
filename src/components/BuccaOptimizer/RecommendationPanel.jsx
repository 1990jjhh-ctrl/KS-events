import './RecommendationPanel.css';

function fmtQty(n) {
  if (!isFinite(n)) return '∞';
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

function fmtKeys(n) {
  if (!isFinite(n)) return '∞';
  return Math.round(n).toLocaleString();
}

function strategyLabel(strategy) {
  if (!strategy) return '—';
  if (strategy.rerollCost === 0) return 'Open all chest types (auto-refresh)';
  return `Open ${strategy.subsetLabels.join(' + ')} only`;
}

export default function RecommendationPanel({
  result, chestTypes, rewardItems, targetItemId,
  keyBudget, freeRerollsRemaining,
  forwardResult, backwardResult, targetQty, onTargetQtyChange,
}) {
  const { rankedSlots, recommendedSlotIndices, evByChestType, rerollAdvice } = result;
  const targetLabel = rewardItems.find((r) => r.id === targetItemId)?.label ?? targetItemId;
  const strategy = rerollAdvice.strategy;

  return (
    <div className="rec-panel">

      {/* Section 1: EV Reference Table */}
      <section className="rec-panel__section">
        <h2 className="rec-panel__heading">EV per Chest Type</h2>
        <table className="ev-table">
          <thead>
            <tr>
              <th>Chest</th>
              <th>EV ({targetLabel})</th>
            </tr>
          </thead>
          <tbody>
            {chestTypes.map((ct) => {
              const inStrategy = strategy?.subsetIds.has(ct.id);
              return (
                <tr key={ct.id} className={inStrategy ? 'ev-table__row--strategy' : ''}>
                  <td>
                    <span className={`chest-tag ${ct.colorClass}`}>{ct.label}</span>
                    {inStrategy && <span className="ev-table__strategy-dot" title="In optimal strategy" />}
                  </td>
                  <td className="ev-table__value">{(evByChestType[ct.id] ?? 0).toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Section 2: Ranked Chest List */}
      <section className="rec-panel__section">
        <h2 className="rec-panel__heading">Ranked Slots</h2>
        <ol className="rank-list">
          {rankedSlots.map((slot, i) => {
            const isRec = recommendedSlotIndices.has(slot.slotIndex);
            return (
              <li key={slot.slotIndex} className={`rank-list__item ${isRec ? 'rank-list__item--rec' : ''}`}>
                <span className="rank-list__num">#{i + 1}</span>
                <span className={`chest-tag ${slot.colorClass}`}>{slot.label}</span>
                <span className="rank-list__slot">Slot {slot.slotIndex + 1}</span>
                <span className="rank-list__ev">{slot.ev.toFixed(3)}</span>
                {isRec && <span className="rank-list__check" aria-label="Recommended">✓</span>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Section 3: Reroll Advice Card */}
      <section className="rec-panel__section">
        <h2 className="rec-panel__heading">Recommendation</h2>
        <div className={`advice-card ${rerollAdvice.shouldReroll ? 'advice-card--reroll' : 'advice-card--open'}`}>
          <div className="advice-card__verdict">
            {rerollAdvice.shouldReroll ? 'REROLL' : 'OPEN'}
          </div>
          <p className="advice-card__reasoning">{rerollAdvice.reasoning}</p>
          {rerollAdvice.effectiveRerollCost === 0 && rerollAdvice.shouldReroll && (
            <p className="advice-card__free-tag">Free reroll — no keys spent</p>
          )}
        </div>
      </section>

      {/* Section 4: Projection */}
      <section className="rec-panel__section">
        <h2 className="rec-panel__heading">Projection</h2>

        <div className="strategy-banner">
          <span className="strategy-banner__label">Strategy</span>
          <span className="strategy-banner__value">{strategyLabel(strategy)}</span>
        </div>

        {/* Forward: keys → items */}
        <div className="proj-block">
          <div className="proj-block__label">
            {keyBudget.toLocaleString()} keys
            {freeRerollsRemaining > 0 && ` + ${freeRerollsRemaining} free reroll${freeRerollsRemaining !== 1 ? 's' : ''}`}
          </div>
          <div className="proj-block__arrow">→</div>
          <div className="proj-block__result">
            <span className="proj-block__qty">~{fmtQty(forwardResult?.expectedYield ?? 0)}</span>
            <span className="proj-block__unit">{targetLabel}</span>
          </div>
        </div>

        {/* Backward: items → keys */}
        <div className="proj-block proj-block--backward">
          <div className="proj-block__input-row">
            <label className="proj-block__label" htmlFor="target-qty">Target</label>
            <input
              id="target-qty"
              type="number"
              min="1"
              step="1"
              className="proj-block__qty-input"
              value={targetQty || ''}
              placeholder="0"
              onChange={(e) => onTargetQtyChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
              aria-label={`Target quantity of ${targetLabel}`}
            />
            <span className="proj-block__unit">{targetLabel}</span>
          </div>
          <div className="proj-block__arrow">→</div>
          {backwardResult ? (
            <div className="proj-block__result">
              <span className="proj-block__qty">~{fmtKeys(backwardResult.keysNeeded)}</span>
              <span className="proj-block__unit">keys</span>
              <span className="proj-block__detail">
                ~{backwardResult.numBoards} board{backwardResult.numBoards !== 1 ? 's' : ''}
                {backwardResult.freeRerollSavings > 0 && ` · saves ${backwardResult.freeRerollSavings} keys`}
              </span>
            </div>
          ) : (
            <div className="proj-block__result proj-block__result--empty">
              enter a target quantity
            </div>
          )}
        </div>

      </section>

    </div>
  );
}
