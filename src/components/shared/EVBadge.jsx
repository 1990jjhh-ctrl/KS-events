export default function EVBadge({ ev, targetLabel }) {
  return (
    <span className="ev-badge" title={`Expected ${targetLabel} per open`}>
      EV {ev.toFixed(3)}
    </span>
  );
}
