"use client";

import { useState } from "react";

export function BarLoginScreen({
  onBack,
  onSuccess,
}: {
  onBack?: () => void;
  onSuccess: (input: { email: string; password: string }) => Promise<boolean>;
}) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: "email" | "password") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const email = form.email.trim();
    if (!email || !form.password) {
      setError("Enter your email and password");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const ok = await onSuccess({ email, password: form.password });
      if (!ok) setError("Invalid account email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      <form style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }} onSubmit={handleSubmit}>
        <button type="button" className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={styles.backText}>back</span>
        </button>

        <div style={{ ...styles.iconWrap, animation: "scaleIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        </div>

        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>Sign in to your bar</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both" }}>Use your OnTap account, then choose who is working.</p>

        <div style={{ ...styles.fields, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.25s both" }}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input style={styles.input} type="email" placeholder="you@yourbar.com" value={form.email} onChange={handleChange("email")} autoComplete="email" disabled={loading} />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input style={styles.input} type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={handleChange("password")} autoComplete="current-password" disabled={loading} />
              <button type="button" className="icon-animate" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
        </div>

        {error && <p style={{ ...styles.errorText, animation: "shake 0.4s ease" }}>{error}</p>}

        <button type="submit" className="btn-animate" style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both" }} disabled={loading}>
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: "relative", width: "100vw", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c" },
  waveContainer: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" },
  waveSvg: { width: "100%", height: "100%", display: "block" },
  card: { position: "relative", zIndex: 1, background: "#ffffff", borderRadius: "20px", padding: "32px 28px", width: "100%", maxWidth: "400px", margin: "20px", boxShadow: "0 8px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", alignItems: "stretch" },
  back: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "0 0 20px", alignSelf: "flex-start" },
  backText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6b7280" },
  iconWrap: { width: "48px", height: "48px", borderRadius: "12px", background: "#0d1f3c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  heading: { fontFamily: "'Inter', sans-serif", fontSize: "24px", fontWeight: "600", color: "#0d1f3c", margin: "0 0 4px", letterSpacing: "-0.02em", textAlign: "center" },
  subheading: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6b7280", margin: "0 0 24px", textAlign: "center", lineHeight: "1.5" },
  fields: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#374151", fontWeight: "500" },
  inputWrap: { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0 12px", background: "#ffffff", height: "44px" },
  input: { flex: 1, border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#0d1f3c", background: "transparent", minWidth: 0 },
  eyeBtn: { border: "none", background: "transparent", padding: 0, display: "flex", cursor: "pointer" },
  errorText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444", margin: "0 0 12px", textAlign: "center" },
  submitBtn: { width: "100%", padding: "15px", background: "#0d1f3c", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", fontFamily: "'Inter', sans-serif", cursor: "pointer", letterSpacing: "-0.01em" },
};
