/**
 * CloudAudit — Babel preset for Jest (Node current).
 * Compiles ESM and modern syntax in `src/` during unit tests.
 */
export default {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};
