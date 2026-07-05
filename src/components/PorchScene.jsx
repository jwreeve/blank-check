export default function PorchScene({ children }) {
  return (
    <div className="porch-scene">
      <div className="porch-backdrop" aria-hidden="true" />
      <div className="porch-stage">{children}</div>
    </div>
  );
}
