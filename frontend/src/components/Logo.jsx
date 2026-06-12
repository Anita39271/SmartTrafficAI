import { TrafficCone } from "lucide-react";

export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-700/25">
        <TrafficCone size={23} />
      </div>
      {!compact && (
        <div>
          <p className="text-lg font-black tracking-tight">SmartTraffic AI</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Queensland traffic prediction</p>
        </div>
      )}
    </div>
  );
}
