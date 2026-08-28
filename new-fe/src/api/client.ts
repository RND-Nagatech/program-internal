const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5010/api";
const TOKEN_KEY = "program_internal_token";
const USER_KEY = "program_internal_user";
const LAUNCHED_APPS_KEY = "program_internal_launched_apps";

export interface SessionUser {
  id?: string;
  userId?: string;
  username: string;
  name: string;
  role: string;
}

export interface Role {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

export interface Menu {
  _id: string;
  code: string;
  name: string;
  division: string;
  description?: string;
  targetUrl: string;
  defaultPath: string;
  requiresLogin: boolean;
  allowedRoles: string[];
  isActive: boolean;
}

export interface User {
  _id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function rememberLaunchedApp(targetUrl: string) {
  const normalizedUrl = targetUrl.replace(/\/$/, "");
  const raw = localStorage.getItem(LAUNCHED_APPS_KEY);
  const urls = raw ? (JSON.parse(raw) as string[]) : [];
  if (!urls.includes(normalizedUrl)) {
    localStorage.setItem(LAUNCHED_APPS_KEY, JSON.stringify([...urls, normalizedUrl]));
  }
}

export function getLaunchedApps() {
  const raw = localStorage.getItem(LAUNCHED_APPS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export function clearLaunchedApps() {
  localStorage.removeItem(LAUNCHED_APPS_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && path !== "/auth/login") {
    clearSession();
    window.location.href = "/login";
    throw new Error("Sesi login sudah berakhir.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request gagal.");
  }

  return payload;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  roles: () => request<Role[]>("/admin/roles"),
  menus: () => request<Menu[]>("/admin/menus"),
  users: () => request<User[]>("/admin/users"),
  createRole: (data: Partial<Role>) => request<Role>("/admin/roles", { method: "POST", body: JSON.stringify(data) }),
  updateRole: (id: string, data: Partial<Role>) =>
    request<Role>(`/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRole: (id: string) => request<{ success: boolean }>(`/admin/roles/${id}`, { method: "DELETE" }),
  createUser: (data: Partial<User> & { password?: string }) =>
    request<User>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User> & { password?: string }) =>
    request<User>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
  createMenu: (data: Partial<Menu>) => request<Menu>("/admin/menus", { method: "POST", body: JSON.stringify(data) }),
  updateMenu: (id: string, data: Partial<Menu>) =>
    request<Menu>(`/admin/menus/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMenu: (id: string) => request<{ success: boolean }>(`/admin/menus/${id}`, { method: "DELETE" }),
  launch: (id: string) => request<{ url: string }>(`/launcher/${id}/launch`, { method: "POST" }),
};
