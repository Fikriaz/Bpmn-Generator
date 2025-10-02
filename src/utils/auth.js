// src/utils/auth.js
export const API_BASE = "http://localhost:8080";

const TOKEN_KEY = "authToken";
const USER_KEY = "user";
const REDIRECT_KEY = "redirectAfterLogin";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function setRedirect(path) {
  localStorage.setItem(REDIRECT_KEY, path);
}
export function consumeRedirect() {
  const p = localStorage.getItem(REDIRECT_KEY);
  if (p) localStorage.removeItem(REDIRECT_KEY);
  return p;
}

/**
 * authFetch: otomatis kirim Authorization header kalau token ada.
 * Otomatis deteksi 401 → simpan redirect & optional redirect ke login.
 */
export async function authFetch(input, init = {}, opts) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  // Biar FormData ga di-override content-type boundary
  if (!(init.body instanceof FormData)) {
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(input, { ...init, headers });

  if (resp.status === 401) {
    try {
      const current = window.location.pathname + window.location.search;
      setRedirect(current);
    } catch {}
    if (opts && opts.onUnauthorizedRedirectTo) {
      window.location.replace(opts.onUnauthorizedRedirectTo);
    }
  }
  return resp;
}
