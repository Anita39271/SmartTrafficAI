import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import { AdminLogin, Home, Login, Signup } from "./pages/PublicPages.jsx";
import { HistoryPage, MapPrediction, PredictionResult, ProfilePage, SettingsPage } from "./pages/UserPages.jsx";
import { AdminDashboard, AIManagement, FetchLiveData, ManageAdmins, ReportsAnalytics, TrafficRecords, UploadTrafficData } from "./pages/AdminPages.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function RequireSession({ type, children }) {
  const { session } = useAuth();
  if (!session || session.type !== type) return <Navigate to={type === "admin" ? "/admin-login" : "/login"} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-login" element={<AdminLogin />} />
        </Route>

        <Route element={<RequireSession type="user"><DashboardLayout type="user" /></RequireSession>}>
          <Route path="/dashboard" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapPrediction />} />
          <Route path="/prediction-result" element={<PredictionResult />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route element={<RequireSession type="admin"><DashboardLayout type="admin" /></RequireSession>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/upload" element={<UploadTrafficData />} />
          <Route path="/admin/records" element={<TrafficRecords />} />
          <Route path="/admin/fetch" element={<FetchLiveData />} />
          <Route path="/admin/ai" element={<AIManagement />} />
          <Route path="/admin/admins" element={<ManageAdmins />} />
          <Route path="/admin/reports" element={<ReportsAnalytics />} />
          <Route path="/admin/profile" element={<ProfilePage admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
