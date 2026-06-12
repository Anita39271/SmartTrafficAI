import { Link, NavLink, Outlet } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function PublicLayout() {
  const nav = ["Home", "User Login", "User Sign up", "Admin Login"];
  const paths = ["/", "/login", "/signup", "/admin-login"];
  return (
    <div className="page-shell">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-[#10131a]/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item, index) => (
              <NavLink
                key={item}
                to={paths[index]}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`
                }
              >
                {item}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
