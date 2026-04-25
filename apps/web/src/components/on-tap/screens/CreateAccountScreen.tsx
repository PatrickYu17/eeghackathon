"use client";

import { useState } from "react";

export function CreateAccountScreen({
  onBack,
  onSubmit,
  onSignIn,
}: {
  onBack?: () => void;
  onSubmit?: (input: {
    barName: string;
    email: string;
    password: string;
    managerCode: string;
  }) => Promise<boolean> | boolean;
  onSignIn?: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    barName: "",
    email: "",
    password: "",
    confirmPassword: "",
    managerCode: "",
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.barName || !form.email || !form.password || !form.managerCode) {
      setError("Please fill in all fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.managerCode.length !== 4) {
      setError("Manager code must be 4 digits");
      return;
    }
    setLoading(true);
    try {
      if (!onSubmit) {
        setError("Account creation is unavailable");
        return;
      }

      const ok = await onSubmit({
        barName: form.barName.trim(),
        email: form.email.trim(),
        password: form.password,
        managerCode: form.managerCode,
      });
      if (!ok) setError("Failed to create account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Wave */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      {/* Card */}
      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        {/* Back */}
        <button className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={styles.backText}>back</span>
        </button>

        {/* Header */}
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>Create Account</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>Set up your bar dashboard</p>

        {/* Fields */}
        <div style={{ ...styles.fields, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both" }}>
          {/* Bar name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Bar name</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <input style={styles.input} type="text" placeholder="The Anchor Bar" value={form.barName} onChange={handleChange("barName")} />
            </div>
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input style={styles.input} type="email" placeholder="you@yourbar.com" value={form.email} onChange={handleChange("email")} />
            </div>
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input style={styles.input} type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={handleChange("password")} />
              <button className="icon-animate" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm password</label>
            <div className="input-animate" style={styles.inputWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input style={styles.input} type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirmPassword} onChange={handleChange("confirmPassword")} />
              <button className="icon-animate" style={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          {/* Manager code */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Manager code{" "}
              <span style={styles.labelNote}>— you&apos;ll use this to access reports</span>
            </label>
            <div className="input-animate" style={{ ...styles.inputWrap, ...styles.codeWrap }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              <input style={{ ...styles.input, ...styles.codeInput }} type="text" placeholder="_ _ _ _" maxLength={4} value={form.managerCode} onChange={handleChange("managerCode")} />
              <span style={styles.codeHint}>choose 4 digits</span>
            </div>
          </div>
        </div>

        {/* Keep logged in */}
        <div style={{ ...styles.checkRow, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both" }}>
          <div style={{ ...styles.checkbox, ...(keepLoggedIn ? styles.checkboxChecked : {}), transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)" }} onClick={() => setKeepLoggedIn(!keepLoggedIn)}>
            {keepLoggedIn && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{ animation: "checkPop 0.25s cubic-bezier(0.25, 1, 0.5, 1)" }}><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span style={styles.checkLabel}>Keep me logged in</span>
        </div>

        {error && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444", margin: "0 0 12px", textAlign: "center", animation: "shake 0.4s ease" }}>{error}</p>
        )}

        {/* Submit */}
        <button
          className="btn-animate"
          style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.35s both" }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {/* Sign in */}
        <p style={{ ...styles.footer, animation: "fadeIn 0.5s ease 0.4s both" }}>
          Already have an account?{" "}
          <span style={styles.footerLink} onClick={onSignIn}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "auto",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d1f3c",
  },
  waveContainer: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  waveSvg: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "#ffffff",
    borderRadius: "20px",
    padding: "32px 28px",
    width: "100%",
    maxWidth: "400px",
    margin: "40px 20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0 0 20px",
  },
  backText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "24px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 24px",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginBottom: "18px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#374151",
    fontWeight: "500",
  },
  labelNote: {
    fontWeight: "400",
    color: "#9ca3af",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px 12px",
    background: "#fff",
  },
  codeWrap: {
    border: "1.5px solid #0d1f3c",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#0d1f3c",
    background: "transparent",
  },
  codeInput: {
    letterSpacing: "0.2em",
    fontSize: "16px",
    fontWeight: "500",
  },
  codeHint: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
    color: "#9ca3af",
    whiteSpace: "nowrap",
  },
  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    minWidth: "18px",
    border: "1.5px solid #d1d5db",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    cursor: "pointer",
  },
  checkboxChecked: {
    background: "#0d1f3c",
    borderColor: "#0d1f3c",
  },
  checkLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#374151",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    background: "#0d1f3c",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    marginBottom: "16px",
  },
  footer: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "center",
    margin: 0,
  },
  footerLink: {
    color: "#0d1f3c",
    fontWeight: "600",
    textDecoration: "underline",
    cursor: "pointer",
  },
};
