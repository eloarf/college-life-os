export default function ProgressBar({ value, max, label }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const widthText = percent + '%';
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="progress__fill" style={{ width: widthText }} />
    </div>
  );
}