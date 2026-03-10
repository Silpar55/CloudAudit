import { fmtShort } from "~/utils/format";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 shadow-xl text-xs z-50">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-white">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-mono font-semibold">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartTooltip;
