export default function PorchScene({ children }) {
  return (
    <div className="porch-scene">
      <div className="porch-wall" aria-hidden="true" />
      <div className="porch-window" aria-hidden="true">
        <div className="porch-window-curtain" />
        <div className="porch-window-pane" />
      </div>
      <div className="porch-lights" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={`porch-bulb porch-bulb-${i}`} />
        ))}
      </div>
      <div className="porch-siding" aria-hidden="true" />
      <div className="porch-roof" aria-hidden="true" />
      <div className="porch-column porch-column-left" aria-hidden="true" />
      <div className="porch-column porch-column-right" aria-hidden="true" />
      <div className="porch-stage">{children}</div>
      <div className="porch-turf" aria-hidden="true">
        <div className="porch-doormat" />
      </div>
      <div className="porch-railing" aria-hidden="true" />
      <div className="porch-lattice" aria-hidden="true" />
    </div>
  );
}
