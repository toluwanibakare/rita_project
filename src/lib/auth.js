const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const STORAGE_KEYS = {
  user: "iomt_user",
  token: "iomt_token",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function saveSession(user, token) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.token, token || "local-session-token");
}

function loadSession() {
  if (!isBrowser()) return { user: null, token: null };

  const userRaw = localStorage.getItem(STORAGE_KEYS.user);
  const token = localStorage.getItem(STORAGE_KEYS.token);

  return {
    user: userRaw ? JSON.parse(userRaw) : null,
    token,
  };
}

async function requestJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    const message = errorPayload?.message || errorPayload?.error || "Request failed";
    throw new Error(message);
  }

  return res.json();
}

export function getCurrentUser() {
  return loadSession().user;
}

export function isAuthenticated() {
  return Boolean(loadSession().token);
}

export async function signup({ fullName, email, password }) {
  try {
    const data = await requestJson("/api/auth/signup", { fullName, email, password });
    saveSession(data.user, data.token);
    return data.user;
  } catch {
    // Fallback path for this demo app when auth endpoints are not available.
    const user = {
      id: `USR-${Date.now()}`,
      fullName,
      email,
      role: "Analyst",
      organization: "IoMT Security Lab",
      phone: "",
      bio: "",
    };
    saveSession(user, "local-signup-token");
    return user;
  }
}

export async function login({ email, password }) {
  try {
    const data = await requestJson("/api/auth/login", { email, password });
    saveSession(data.user, data.token);
    return data.user;
  } catch {
    const existingUser = getCurrentUser();

    // For local fallback mode, we allow login for the most recently registered email.
    if (existingUser && existingUser.email === email && password.length >= 6) {
      saveSession(existingUser, "local-login-token");
      return existingUser;
    }

    throw new Error("Invalid credentials. Please check your email and password.");
  }
}

export async function updateProfile(nextProfile) {
  const { token } = loadSession();

  try {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(nextProfile),
    });

    if (!res.ok) throw new Error("Failed profile update");

    const data = await res.json();
    saveSession(data.user, token || data.token);
    return data.user;
  } catch {
    const merged = { ...getCurrentUser(), ...nextProfile };
    saveSession(merged, token || "local-profile-token");
    return merged;
  }
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.token);
}
