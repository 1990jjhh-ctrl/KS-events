import './RecommendationPanel.css';

function fmt(n) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(3);
}

export default function RecommendationPanel({ result, chestTypes, rewardItems, targetItemId, keyBudget, freeRerollsRemaining }) {
  const { rankedSlots, recommendedSlotIndices, evByChestType, rerollAdvice, projection } = result;
  const targetLabel = rewardItems.find((r) => r.id === targetItemId)?.label ?? targetItemId;

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
            {chestTypes.map((ct) => (
              <tr key={ct.id}>
                <td>
                  <span className={`chest-tag ${ct.colorClass}`}>{ct.label}</span>
                </td>
                <td className="ev-table__value">{(evByChestType[ct.id] ?? 0).toFixed(3)}</td>
              </tr>
            ))}
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
          {rerollAdvice.effectiveRerollCost === 0 && (
            <p className="advice-card__free-tag">Free reroll — no keys spent</p>
          )}
        </div>
      </section>

      {/* Section 4: Key Budget Projection */}
      <section className="rec-panel__section">
        <h2 className="rec-panel__heading">Key Budget Projection</h2>
        <div className="projection-card">
          <p className="projection-card__headline">
            With <strong>{keyBudget} keys</strong>
            {freeRerollsRemaining > 0 && (
              <> + <strong>{freeRerollsRemaining} free reroll{freeRerollsRemaining !== 1 ? 's' : ''}</strong></>
            )}
            {' '}expect{' '}
            <strong className="projection-card__yield">
              ~{fmt(projection.totalExpectedYield)} {targetLabel}
            </strong>
          </p>
          <ul className="projection-card__stats">
            <li><span className="stat-label">Keys spent</span><span className="stat-value">{projection.keysSpent}</span></li>
            <li><span className="stat-label">Boards played</span><span className="stat-value">{projection.boardsPlayed}</span></li>
            {projection.freeRerollsUsed > 0 && (
              <li><span className="stat-label">Free rerolls used</span><span className="stat-value">{projection.freeRerollsUsed}</span></li>
            )}
            {projection.paidRerollsUsed > 0 && (
              <li><span className="stat-label">Paid rerolls</span><span className="stat-value">{projection.paidRerollsUsed} (−{projection.paidRerollsUsed * 90} keys)</span></li>
            )}
          </ul>
        </div>
      </section>

    </div>
  );
}
