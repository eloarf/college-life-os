export default function PageHeader({ eyebrow, title }) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <div className="page-header__rule" aria-hidden="true" />
    </header>
  );
}