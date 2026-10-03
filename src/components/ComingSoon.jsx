export default function ComingSoon({ emoji, title, children }) {
  return (
    <div className="empty">
      <span className="empty__emoji" aria-hidden="true">{emoji}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}