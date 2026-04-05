/**
 * CloudAudit — Shared UI primitive: `Spinner.tsx`.
 * Reusable across features; keep presentation-agnostic where possible.
 */

type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner = ({ size = 56, className = "" }: SpinnerProps) => {
  return (
    <div
      className={`border-4 border-aws-orange border-t-transparent rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default Spinner;
