import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

const admins = [
  { full_name: "Anita", email: "anita@smarttraffic.ai", role: "super_admin" },
];

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("smarttraffic-session")) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const saveSession = (nextSession, token) => {
    setSession(nextSession);
    localStorage.setItem("smarttraffic-session", JSON.stringify(nextSession));
    if (token) localStorage.setItem("smarttraffic-token", token);
  };

  const saveAuthResponse = (data) => {
    const nextSession = { type: data.type, profile: data.account };
    saveSession(nextSession, data.token);
    return { ok: true, session: nextSession };
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.type === "user" ? session.profile : null,
      admin: session?.type === "admin" ? session.profile : null,
      admins,
      loginUser: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        return saveAuthResponse(data);
      },
      signupUser: async (profile) => {
        const { data } = await api.post("/auth/signup", profile);
        return saveAuthResponse(data);
      },
      loginAdmin: async (email, password) => {
        const { data } = await api.post("/auth/admin-login", { email, password });
        return saveAuthResponse(data);
      },
      refreshMe: async () => {
        const { data } = await api.get("/auth/me");
        const nextSession = { type: data.type, profile: data.account };
        saveSession(nextSession);
        return nextSession;
      },
      logout: () => {
        api.post("/auth/logout").catch(() => {});
        setSession(null);
        localStorage.removeItem("smarttraffic-session");
        localStorage.removeItem("smarttraffic-token");
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
