import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smarttraffic-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiError(error) {
  if (!error.response) return "Backend or database is not connected. Please start the backend server and PostgreSQL.";
  return error.response.data?.message || "Something went wrong. Please try again.";
}

export default api;
