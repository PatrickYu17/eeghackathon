"use client";

import { useCallback, useState, useEffect, useRef } from "react";

export function ManagerLoginScreen({
  onBack,
  onSuccess,
  onForgotCode,
  onLogin,
}: {
  onBack?: () => void;
  onSuccess?: () => void;
  onForgotCode?: () => void;
  onLogin: (code: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const codeRef = useRef(code);
  const loadingRef = useRef(loading);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const handleKey = useCallback((num: number) => {
    const currentCode = codeRef.current;
    const currentLoading = loadingRef.current;
    if (currentCode.length >= 4 || currentLoading) return;
    const next = [...currentCode, String(num)];
    setCode(next);
    setError(false);
    if (next.length === 4) {
      setLoading(true);
      loadingRef.current = true;
      onLogin(next.join(""))
        .then((ok) => {
          if (ok) onSuccess && onSuccess();
          else {
            setError(true);
            setCode([]);
            codeRef.current = [];
          }
        })
        .catch(() => {
          setError(true);
          setCode([]);
          codeRef.current = [];
        })
        .finally(() => {
          setLoading(false);
          loadingRef.current = false;
        });
    }
  }, [onLogin, onSuccess]);

  const handleDelete = useCallback(() => {
    if (loadingRef.current) return;
    setCode((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  const isError = error;

  const handleUnlock = useCallback(() => {
    const currentCode = codeRef.current;
    const currentLoading = loadingRef.current;
    if (currentCode.length !== 4 || currentLoading) return;
    setLoading(true);
    loadingRef.current = true;
    onLogin(currentCode.join(""))
      .then((ok) => {
        if (ok) onSuccess && onSuccess();
        else {
          setError(true);
          setCode([]);
          codeRef.current = [];
        }
      })
      .catch(() => {
        setError(true);
        setCode([]);
        codeRef.current = [];
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }, [onLogin, onSuccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleKey(parseInt(e.key, 10));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleUnlock();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBack?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete, handleKey, handleUnlock, onBack]);

  return (
    <div style={styles.root}>
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        {/* Back */}
        <button className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={styles.backText}>back</span>
        </button>

        {/* Icon */}
        <div style={{ ...styles.iconWrap, background: isError ? "#fee2e2" : "#0d1f3c", animation: "scaleIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both", transition: "background 0.3s ease" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isError ? "#ef4444" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.12s both" }}>Enter your code</h1>
        {isError
          ? <p style={{ ...styles.errorText, animation: "shake 0.35s ease" }}>Incorrect code - try again</p>
          : <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.18s both" }}>{loading ? "Checking manager code..." : "Your personal manager code"}</p>
        }

        {/* Code boxes */}
        <div style={{ ...styles.codeRow, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.22s both" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              ...styles.codeBox,
              borderColor: isError ? "#ef4444" : code[i] ? "#0d1f3c" : "#e5e7eb",
              background: isError ? "#fee2e2" : "#fff",
              animation: code[i] ? "codeBoxPop 0.2s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
            }}>
              {isError
                ? <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 0.5s ease" }} />
                : <span style={styles.codeDigit}>{code[i] || ""}</span>
              }
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div style={{ ...styles.keypad, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.28s both" }}>
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} className="btn-animate" style={styles.key} onClick={() => handleKey(n)}>{n}</button>
          ))}
          <div style={styles.keyEmpty} />
          <button className="btn-animate" style={styles.key} onClick={() => handleKey(0)}>0</button>
          <button className="btn-animate" style={styles.keyDelete} onClick={handleDelete}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
          </button>
        </div>

        {/* Unlock */}
        <button
          className="btn-animate"
          style={{
            ...styles.unlockBtn,
            opacity: loading ? 0.7 : code.length === 4 ? 1 : 0.5,
            cursor: code.length === 4 && !loading ? "pointer" : "not-allowed",
            animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.32s both",
          }}
          disabled={code.length !== 4 || loading}
          onClick={handleUnlock}
        >
          {loading ? "Checking..." : "Unlock Reports"}
        </button>

        {/* Forgot */}
        <p style={{ ...styles.forgot, animation: "fadeIn 0.5s ease 0.38s both" }}>
          Forgot your code?{" "}
          <span style={styles.forgotLink} onClick={onForgotCode}>reset via email</span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: "relative", width: "100vw", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c" },
  waveContainer: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" },
  waveSvg: { width: "100%", height: "100%", display: "block" },
  card: { position: "relative", zIndex: 1, background: "#ffffff", borderRadius: "20px", padding: "32px 36px", width: "100%", maxWidth: "420px", margin: "20px", boxShadow: "0 8px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", alignItems: "center" },
  back: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "0 0 20px", alignSelf: "flex-start" },
  backText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6b7280" },
  iconWrap: { width: "52px", height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", transition: "background 0.2s" },
  heading: { fontFamily: "'Inter', sans-serif", fontSize: "22px", fontWeight: "600", color: "#0d1f3c", margin: "0 0 6px", letterSpacing: "-0.02em", textAlign: "center" },
  subheading: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6b7280", margin: "0 0 24px", textAlign: "center" },
  errorText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444", margin: "0 0 24px", textAlign: "center" },
  codeRow: { display: "flex", gap: "12px", marginBottom: "28px" },
  codeBox: { width: "60px", height: "68px", border: "1.5px solid", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  codeDigit: { fontFamily: "'Inter', sans-serif", fontSize: "24px", fontWeight: "600", color: "#0d1f3c" },
  keypad: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", width: "100%", maxWidth: "280px", marginBottom: "24px" },
  key: { height: "52px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: "500", color: "#0d1f3c", cursor: "pointer", transition: "background 0.12s" },
  keyEmpty: { height: "52px" },
  keyDelete: { height: "52px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  unlockBtn: { width: "100%", padding: "15px", background: "#0d1f3c", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", fontFamily: "'Inter', sans-serif", cursor: "pointer", marginBottom: "16px", letterSpacing: "-0.01em" },
  forgot: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#9ca3af", margin: 0, textAlign: "center" },
  forgotLink: { color: "#0d1f3c", fontWeight: "600", textDecoration: "underline", cursor: "pointer" },
};
