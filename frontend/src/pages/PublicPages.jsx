import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, Mail, MapPin, Navigation, Route, ShieldCheck, UserPlus } from "lucide-react";
import Logo from "../components/Logo.jsx";
import { AlertBox } from "../components/StateBox.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api, { getApiError } from "../services/api.js";

export function Home() {
  const [preview, setPreview] = useState({
    status: "idle",
    label: "Brisbane to Gold Coast",
    detail: "Fallback preview. Allow location to show your local traffic preview.",
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setPreview({ status: "fallback", label: "Brisbane to Gold Coast", detail: "Location is not available in this browser. Showing fallback Queensland preview." });
      return;
    }
    setPreview((current) => ({ ...current, status: "requesting", detail: "Allow location to show your live local traffic preview." }));
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const { data } = await api.get("/maps/reverse-geocode", { params: { lat: latitude, lng: longitude } });
          label = data.suburb || data.city || data.location || data.formatted || label;
        } catch {
          try {
            const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
            if (key) {
              const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${key}`);
              const reverse = await response.json();
              const props = reverse.features?.[0]?.properties;
              label = props?.suburb || props?.city || props?.county || props?.formatted || label;
            }
          } catch {
            // Keep coordinate label if reverse geocoding is unavailable.
          }
        }
        setPreview({ status: "live", label, detail: "Live local traffic preview based on your browser location." });
      },
      () => setPreview({ status: "denied", label: "Brisbane to Gold Coast", detail: "Location permission is needed to show your live local traffic preview. Showing fallback route instead." }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const isFallback = preview.status === "denied" || preview.status === "fallback";

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.2),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(244,63,94,0.16),transparent_30%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
              Queensland focused AI traffic forecasting
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">SmartTraffic AI</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Plan future trips across Queensland with AI traffic predictions, colour-coded route options, incident signals, and dashboard-ready insights.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/map" className="btn-primary">
                Try map prediction <ArrowRight size={18} />
              </Link>
              <Link to="/admin-login" className="btn-secondary">
                Admin portal
              </Link>
            </div>
          </div>
          <div className="panel overflow-hidden p-4">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-200">{preview.status === "live" ? "Live local preview" : "Fallback preview"}</p>
                  <p className="text-xl font-black">{preview.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{preview.detail}</p>
                </div>
                <Route className="text-teal-300" />
              </div>
              <div className="relative h-80 overflow-hidden rounded-2xl bg-slate-800">
                <div className="absolute left-8 top-10 h-56 w-1 rounded-full bg-teal-400" />
                <div className="absolute left-8 top-10 h-4 w-4 -translate-x-1.5 rounded-full bg-white ring-4 ring-teal-400" />
                <div className="absolute bottom-12 left-8 h-4 w-4 -translate-x-1.5 rounded-full bg-white ring-4 ring-rose-400" />
                <div className="absolute left-20 top-12 w-56 rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-bold text-teal-100">{isFallback ? "Fallback Route 1" : "Local preview"}</p>
                  <p className="mt-2 text-3xl font-black">47 min</p>
                  <p className="mt-1 text-sm text-slate-300">Preview only until a route is selected</p>
                </div>
                <div className="absolute bottom-10 right-6 grid gap-2">
                  {["Current area", "Traffic context", isFallback ? "Fallback location" : "Location allowed"].map((item, index) => (
                    <div key={item} className="rounded-xl bg-white/10 px-3 py-2 text-sm backdrop-blur">
                      <span className={index === 0 ? "text-emerald-300" : index === 1 ? "text-amber-300" : "text-rose-300"}>•</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
export function About() {
  const items = [
    ["Future travel planning", "Enter a trip date and time to preview likely congestion before you leave."],
    ["Queensland map context", "Predicted routes, incidents, and roadworks focus on familiar Queensland corridors."],
    ["Connected platform", "Traffic records, predictions, and user accounts are stored through the SmartTraffic AI backend."],
  ];
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight">About SmartTraffic AI</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          SmartTraffic AI is a traffic prediction platform for AI-assisted route planning in Queensland. It helps users compare route risk, expected delay, and traffic confidence before choosing a trip.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {items.map(([title, text]) => (
          <div key={title} className="panel p-6">
            <CheckCircle2 className="text-teal-600" />
            <h2 className="mt-4 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const isAdmin = mode === "admin";
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.email || !form.password || (isSignup && !form.name)) {
      setError("Please complete the required fields.");
      return;
    }
    if (isSignup && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (isAdmin) {
      try {
        await auth.loginAdmin(form.email, form.password);
        setSuccess("Admin login successful. Opening dashboard...");
        setTimeout(() => navigate("/admin/dashboard"), 350);
      } catch (apiError) {
        setError(getApiError(apiError));
      }
      return;
    }
    try {
      if (isSignup) {
        await auth.signupUser({
          full_name: form.name,
          email: form.email,
          password: form.password,
          confirm_password: form.confirmPassword,
        });
      } else {
        await auth.loginUser(form.email, form.password);
      }
      setSuccess(isSignup ? "Account created. Opening AI prediction map..." : "User login successful. Opening AI prediction map...");
      setTimeout(() => navigate("/map"), 350);
    } catch (apiError) {
      setError(getApiError(apiError));
    }
  }

  const title = isAdmin ? "Admin Login" : isSignup ? "Create user account" : "User Login";
  const Icon = isAdmin ? ShieldCheck : isSignup ? UserPlus : Lock;

  return (
    <main className="relative min-h-[calc(100vh-82px)] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.16),rgba(244,63,94,0.08),rgba(234,179,8,0.12))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-82px)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="hidden lg:block">
          <Logo />
          <h1 className="mt-8 max-w-xl text-4xl font-black tracking-tight">Predict smarter trips before Queensland roads get busy.</h1>
          <p className="mt-4 max-w-lg leading-7 text-slate-600 dark:text-slate-300">
            Securely access route prediction, trip tracking, saved history, traffic records, and administration tools from one workspace.
          </p>
        </div>
        <form onSubmit={submit} className="panel mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-600 p-3 text-white">
              <Icon size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{isAdmin ? "Administrator access" : isSignup ? "Create your SmartTraffic AI account" : "Sign in to SmartTraffic AI"}</p>
            </div>
          </div>
          {error && <div className="mb-4"><AlertBox type="error" text={error} /></div>}
          {success && <div className="mb-4"><AlertBox text={success} /></div>}
          <div className="grid gap-4">
            {isSignup && <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <label className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input className="input pl-10" placeholder={isAdmin ? "Admin email address" : "Email address"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {isSignup && <input className="input" type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />}
            <button className="btn-primary w-full" type="submit">{isSignup ? "Create account" : "Log in"}</button>
          </div>
          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {isSignup ? "Already have an account? " : "Need an account? "}
            <Link className="font-bold text-teal-700 dark:text-teal-300" to={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export const Login = () => <AuthPage mode="login" />;
export const Signup = () => <AuthPage mode="signup" />;
export const AdminLogin = () => <AuthPage mode="admin" />;

