import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { api, getToken, saveSession } from "../api/client";

const REMEMBER_LOGIN_KEY = "program_internal_remember_login";

function encodeRememberedPassword(value: string) {
  return btoa(encodeURIComponent(value));
}

function decodeRememberedPassword(value: string) {
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return "";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as { username?: string; password?: string };
      setUsername(saved.username || "");
      setPassword(saved.password ? decodeRememberedPassword(saved.password) : "");
      setRememberMe(true);
    } catch {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
    }
  }, []);

  if (getToken()) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(username, password);
      saveSession(token, user);
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({
            username,
            password: encodeRememberedPassword(password),
          })
        );
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <header className="login-header">
          <div className="login-logo">
            <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="32" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 10V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
              <path d="M4 22v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
              <path d="M10 12h4" />
              <path d="M10 16h4" />
              <path d="M10 20h4" />
              <path d="M10 6h4" />
              <path d="M8 22H4" />
              <path d="M20 22h-4" />
            </svg>
          </div>
          <h1>Program Internal</h1>
          <p>Selamat Datang Kembali. Silakan masuk untuk mengakses ekosistem kerja Anda.</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username Atau Email
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus placeholder="Masukkan email Anda" required />
          </label>
          <label>
            Password
            <div className="password-field">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Masukkan password Anda" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>
          <label className="remember-login">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Ingat saya</span>
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>

        <div className="login-note">
          <ShieldCheck size={16} />
          <span>Akses hanya untuk karyawan terdaftar</span>
        </div>
      </section>
    </main>
  );
}
