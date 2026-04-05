/**
 * CloudAudit — Frontend utility: `format.ts`.
 */

export const getAvatarColor = (name: string) => {
  const avatarGradients = [
    "from-red-500 to-red-600",
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-indigo-500 to-indigo-600",
    "from-yellow-500 to-yellow-600",
    "from-teal-500 to-teal-600",
  ];

  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return avatarGradients[hash % avatarGradients.length];
};

export const getInitials = (name: string) => {
  if (!name) return "";

  const words = name.trim().split(" ");

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
};

// ─── Formatters & Date Helpers ──────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const fmtShort = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
};

export const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export const today = () => new Date().toISOString().split("T")[0];

const PALETTE = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#4ade80",
  "#facc15",
  "#f87171",
  "#60a5fa",
  "#c084fc",
];

export const colorFor = (index: number) => PALETTE[index % PALETTE.length];
