import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // bubble up; pages decide
    }
    return Promise.reject(err);
  }
);

export const fmt = {
  money(cents) {
    if (cents == null) return "$0";
    const n = cents / 100;
    return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
  },
  date(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { console.error("Date formatting failed", e); return iso; }
  },
  datetime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (e) { console.error("Datetime formatting failed", e); return iso; }
  },
};
