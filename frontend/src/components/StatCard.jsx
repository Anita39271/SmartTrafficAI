export default function StatCard({ icon: Icon, label, value, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300",
    coral: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
  };
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
