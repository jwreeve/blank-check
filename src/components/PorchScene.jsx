export default function PorchScene({ children }) {
  return (
    <div className="porch-scene">
      <div className="porch-sky" aria-hidden="true" />
      <div className="porch-light-glow" aria-hidden="true" />
      <div className="porch-lamp" aria-hidden="true" />
      <div className="porch-fireflies" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={`firefly firefly-${i}`} />
        ))}
      </div>
      <div className="porch-siding" aria-hidden="true" />
      <div className="porch-stage">{children}</div>
      <div className="porch-railing" aria-hidden="true" />
    </div>
  );
}
