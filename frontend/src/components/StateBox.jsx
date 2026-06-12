import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function LoadingBox({ text = "Loading traffic intelligence..." }) {
  return (
    <div className="panel flex min-h-40 items-center justify-center gap-3 p-6 text-sm text-slate-500 dark:text-slate-300">
      <Loader2 className="animate-spin text-teal-600" size={20} />
      {text}
    </div>
  );
}

export function EmptyBox({ text = "No records to show yet." }) {
  return <div className="panel p-6 text-sm text-slate-500 dark:text-slate-300">{text}</div>;
}

export function AlertBox({ type = "success", text }) {
  const isSuccess = type === "success";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"}`}>
      {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {text}
    </div>
  );
}
