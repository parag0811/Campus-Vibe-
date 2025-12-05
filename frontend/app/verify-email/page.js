"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./verify.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(
    () => (searchParams.get("email") || "").trim().toLowerCase(),
    [searchParams]
  );

  const [email] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [hasSent, setHasSent] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [message, setMessage] = useState({ type: "info", text: "" });

  const timerRef = useRef(null);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (!email) router.replace("/register");
  }, [email, router]);

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

  const handleSendOrResend = async () => {
    if (!email || cooldown > 0) return;
    setLoadingSend(true);
    setMessage({ type: "info", text: "" });

    const endpoint = hasSent ? "/auth/resend-email-otp" : "/auth/send-email-otp";
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let cd = 60;
        const m = (data?.message || "").match(/(\d+)\s*seconds?/i);
        if (res.status === 429 && m) cd = parseInt(m[1], 10);
        if (res.status === 429) setCooldown(cd);
        throw new Error(data?.message || "Failed to send OTP");
      }
      setHasSent(true);
      setMessage({
        type: "success",
        text: hasSent ? "OTP re-sent. Check your email." : "OTP sent. Check your email.",
      });
      setCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 60);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Could not send OTP" });
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Enter the 6-digit OTP." });
      return;
    }
    setLoadingVerify(true);
    setMessage({ type: "info", text: "" });
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Verification failed");
      setMessage({ type: "success", text: "Email verified. Redirecting to login..." });
      setTimeout(() => router.replace("/login"), 900);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Verification failed" });
    } finally {
      setLoadingVerify(false);
    }
  };

  const buttonLabel =
    cooldown > 0
      ? `${hasSent ? "Resend OTP" : "Send OTP"} (${cooldown}s)`
      : hasSent
      ? "Resend OTP"
      : "Send OTP";

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandPrimary}>Campus</span>
          <span className={styles.brandAccent}> Vibe</span>
        </div>

        <h1 className={styles.title}>Verify your email</h1>
        <p className={styles.subtitle}>
          Enter the 6‑digit code sent to your email address.
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
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="otp" className={styles.label}>Enter OTP</label>
            <input
              ref={otpInputRef}
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
                onClick={handleSendOrResend}
                disabled={loadingSend || cooldown > 0}
                className={styles.secondaryBtn}
              >
                {loadingSend ? (hasSent ? "Resending..." : "Sending...") : buttonLabel}
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
        </form>
      </div>
    </div>
  );
}