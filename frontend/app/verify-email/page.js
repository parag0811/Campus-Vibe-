"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./verify.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const USER_API = `${API_BASE.replace(/\/$/, "")}/user`;

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => {
    const mail = (searchParams.get("email") || "").trim().toLowerCase();
    return mail;
  }, [searchParams]);

  const [email] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [message, setMessage] = useState({ type: "info", text: "" });

  const timerRef = useRef(null);

  // If no email in URL, push back to register
  useEffect(() => {
    if (!email) router.replace("/register");
  }, [email, router]);

  // Cooldown timer ticks
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldown]);

  const handleSend = async () => {
    if (!email) return;
    setLoadingSend(true);
    setMessage({ type: "info", text: "" });
    try {
      const res = await fetch(`${USER_API}/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        // For 429, try to extract seconds from message
        let cd = 60;
        const m = (data?.message || "").match(/(\d+)\s*seconds?/i);
        if (m) cd = parseInt(m[1], 10);
        if (res.status === 429) setCooldown(cd);
        throw new Error(data?.message || "Failed to send OTP");
      }
      setMessage({ type: "success", text: "OTP sent to your email. Check inbox/spam." });
      setCooldown(60); // server cooldown matches 60s
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Could not send OTP" });
    } finally {
      setLoadingSend(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setLoadingSend(true);
    setMessage({ type: "info", text: "" });
    try {
      const res = await fetch(`${USER_API}/resend-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        let cd = 60;
        const m = (data?.message || "").match(/(\d+)\s*seconds?/i);
        if (m) cd = parseInt(m[1], 10);
        if (res.status === 429) setCooldown(cd);
        throw new Error(data?.message || "Failed to resend OTP");
      }
      setMessage({ type: "success", text: "OTP re-sent. Please check your email." });
      setCooldown(60);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Could not resend OTP" });
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Enter the 6‑digit OTP." });
      return;
    }
    setLoadingVerify(true);
    setMessage({ type: "info", text: "" });
    try {
      const res = await fetch(`${USER_API}/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Verification failed");
      }
      setMessage({ type: "success", text: "Email verified successfully. Redirecting to login..." });
      setTimeout(() => router.replace("/login"), 1000);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Verification failed" });
    } finally {
      setLoadingVerify(false);
    }
  };

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [u, d] = email.split("@");
    if (!u || !d) return email;
    const m = u.length <= 2 ? u[0] + "*" : u[0] + "*".repeat(Math.max(1, u.length - 2)) + u[u.length - 1];
    return `${m}@${d}`;
  }, [email]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.leftPane}>
        <div className={styles.brand}>
          <span className={styles.brandPrimary}>Campus</span>
          <span className={styles.brandAccent}> Vibe</span>
        </div>

        <h1 className={styles.title}>Verify your email</h1>
        <p className={styles.subtitle}>
          We’ve sent a 6‑digit code to your email. Please verify to continue.
        </p>

        <form className={styles.form} onSubmit={handleVerify}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Your Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              readOnly
              aria-readonly="true"
            />
            <div className={styles.helper}>
              Not you?{" "}
              <Link className={styles.link} href="/register">
                Change email
              </Link>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="otp" className={styles.label}>Enter OTP</label>
            <input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className={styles.input}
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <div className={styles.actionsRow}>
              <button
                type="button"
                onClick={handleSend}
                disabled={loadingSend || cooldown > 0}
                className={styles.secondaryBtn}
              >
                {loadingSend ? "Sending..." : cooldown > 0 ? `Send OTP (${cooldown}s)` : "Send OTP"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loadingSend || cooldown > 0}
                className={styles.ghostBtn}
              >
                Resend
              </button>
            </div>
          </div>

          {message.text ? (
            <div
              className={
                message.type === "error"
                  ? styles.msgError
                  : message.type === "success"
                  ? styles.msgSuccess
                  : styles.msgInfo
              }
              role="status"
              aria-live="polite"
            >
              {message.text}
            </div>
          ) : null}

          <button type="submit" className={styles.primaryBtn} disabled={loadingVerify}>
            {loadingVerify ? "Verifying..." : "Verify Email"}
          </button>

          <div className={styles.footerLinks}>
            <span>Didn’t get the email to {maskedEmail}? Check spam or resend.</span>
            <div>
              <Link className={styles.link} href="/login">
                Back to Login
              </Link>
            </div>
          </div>
        </form>
      </div>

      <div className={styles.rightPane}>
        <div className={styles.rightOverlay} />
        <div className={styles.rightContent}>
          <h2 className={styles.rightTitle}>Almost there</h2>
          <p className={styles.rightText}>Verify your email to start exploring events.</p>
        </div>
      </div>
    </div>
  );
}