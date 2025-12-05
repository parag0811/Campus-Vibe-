"use client";
import { useState, useRef } from "react";
import styles from "./register-panel.module.css";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/common/toast";

export default function RegisterPanel() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);
  const inFlight = useRef(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const validate = () => {
    const errors = [];
    if (!email) errors.push({ path: "email", msg: "E-mail must not be an empty field." });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ path: "email", msg: "E-mail must be valid." });

    if (!password) errors.push({ path: "password", msg: "Password cannot be an empty field." });
    else if (password.length < 8 || password.length > 18) errors.push({ path: "password", msg: "Password must be 8-18 characters long." });
    else if (!/[A-Z]/.test(password)) errors.push({ path: "password", msg: "Password must contain at least one uppercase character." });
    else if (!/[0-9]/.test(password)) errors.push({ path: "password", msg: "Password must contain at least one number." });

    if (confirmPassword !== password) errors.push({ path: "confirmPassword", msg: "Passwords do not match." });
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    setFieldErrors([]);
    const frontendErrors = validate();
    if (frontendErrors.length) {
      setFieldErrors(frontendErrors);
      return;
    }

    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register-new-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, confirmPassword }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        const firstErr = Array.isArray(data?.data) && data.data.length ? data.data[0]?.msg : null;
        if (Array.isArray(data?.data)) setFieldErrors(data.data);
        throw new Error(firstErr || data?.message || "Registration failed.");
      }

      toast.success(data.message || "Registered successfully.");
      router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`); // use data.email
    } catch (err) {
      toast.error(err.message || "Something went wrong. Try again later.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.rightContent}>
        <div className={styles.logo}>
          Campus <span className={styles.highlight}>Vibe</span>
        </div>

        <h2 className={styles.title}>Sign Up to Campus Vibe</h2>

        <form onSubmit={handleSubmit} className={styles.signUpForm} autoComplete="off">
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>YOUR EMAIL</label>
            <input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} required autoComplete="email" />
            {Array.isArray(fieldErrors) && fieldErrors.find((err) => err.path === "email") && (
              <div style={{ color: "#ef4444", marginTop: 4 }}>{fieldErrors.find((err) => err.path === "email").msg}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>PASSWORD</label>
            <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} required autoComplete="new-password" />
            {Array.isArray(fieldErrors) && fieldErrors.find((err) => err.path === "password") && (
              <div style={{ color: "#ef4444", marginTop: 4 }}>{fieldErrors.find((err) => err.path === "password").msg}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>CONFIRM PASSWORD</label>
            <input id="confirmPassword" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={styles.input} required autoComplete="new-password" />
            {Array.isArray(fieldErrors) && fieldErrors.find((err) => err.path === "confirmPassword") && (
              <div style={{ color: "#ef4444", marginTop: 4 }}>{fieldErrors.find((err) => err.path === "confirmPassword").msg}</div>
            )}
          </div>

          <button type="submit" className={styles.signUpButton} disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
