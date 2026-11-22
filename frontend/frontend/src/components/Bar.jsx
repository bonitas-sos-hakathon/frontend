export default function Bar({ value, label, tone = 'cyan' }) {
  const width = Math.max(0, Math.min(100, value))

  return (
    <div
      className={`bar bar--${tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      aria-label={label}
    >
      <span className="bar__fill" style={{ inlineSize: `${width}%` }} />
    </div>
  )
}
