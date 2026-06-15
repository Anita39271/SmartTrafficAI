import smartTrafficLogo from "../assets/smarttraffic_logo.png";

export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-teal-700/20 ring-1 ring-teal-100 dark:bg-slate-900 dark:ring-white/10">
        <img src={smartTrafficLogo} alt="SmartTraffic AI logo" className="h-9 w-9 object-contain" />
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