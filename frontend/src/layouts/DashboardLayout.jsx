import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BrainCircuit, Database, History, LayoutDashboard, LogOut, Map, Settings, Shield, UploadCloud, User, Users, Wifi } from "lucide-react";
import Logo from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const userNav = [
  { label: "Map Prediction", path: "/map", icon: Map },
  { label: "History", path: "/history", icon: History },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
];

const adminNav = [
  { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Upload Historical Data", path: "/admin/upload", icon: UploadCloud },
  { label: "Traffic Records", path: "/admin/records", icon: Database },
  { label: "Fetch QLDTraffic Data", path: "/admin/fetch", icon: Wifi },
  { label: "AI Management", path: "/admin/ai", icon: BrainCircuit },
  { label: "Reports / Analytics", path: "/admin/reports", icon: BarChart3 },
  { label: "Manage Admins", path: "/admin/admins", icon: Users },
  { label: "Profile", path: "/admin/profile", icon: Shield },
];

export default function DashboardLayout({ type = "user" }) {
  const { logout, user, admin } = useAuth();
  const navigate = useNavigate();
  const profile = type === "admin" ? admin : user;
  const nav = type === "admin" ? adminNav : userNav;

  function handleLogout() {
    logout();
    navigate(type === "admin" ? "/admin-login" : "/login");
  }

  return (
    <div className="page-shell lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#171b24] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
        </div>
        <div className="mb-6 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
          <p className="text-sm font-bold">{profile?.full_name || profile?.name || "SmartTraffic user"}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{profile?.role || type}</p>
        </div>
        <nav className="grid gap-2">
          {nav.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-teal-600 text-white shadow-lg shadow-teal-700/20" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-400/10">
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>
      <main className="min-w-0">
        <div className="flex justify-end border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#171b24] sm:px-6 lg:px-8">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
