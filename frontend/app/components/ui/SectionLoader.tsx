/**
 * CloudAudit — Shared UI primitive: `SectionLoader.tsx`.
 * Reusable across features; keep presentation-agnostic where possible.
 */

import Spinner from "./Spinner";

const SectionLoader = () => {
  return (
    <div className="flex items-center justify-center py-10">
      <Spinner size={48} />
    </div>
  );
};

export default SectionLoader;
