"use client";
import { useState } from "react";
import styles from "./register-panel.module.css";
import { useRouter } from "next/navigation";

export default function RegisterPanel() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  // Utility to parse backend errors
  function parseErrorResponse(err) {
    if (!err) return { message: "Unknown error", fieldErrors: [] };
    if (typeof err === "string") return { message: err, fieldErrors: [] };
    if (err.error) return { message: err.error, fieldErrors: [] };
    if (err.message && err.data)
      return { message: err.message, fieldErrors: err.data };
    if (err.message) return { message: err.message, fieldErrors: [] };
    return { message: "Unknown error", fieldErrors: [] };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors([]);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    try {
      const res = await fetch(`${baseUrl}/auth/register-new-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Express-validator errors come in data: [{ msg, path }]
        const { message, data: validationErrors } = data;
        setError(message || "Registration failed.");
        setFieldErrors(Array.isArray(validationErrors) ? validationErrors : []);
        setLoading(false);
        return;
      }

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      alert(data.message || "Registered successfully.");
      router.push("/login");
    } catch (err) {
      setError("Something went wrong. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.rightContent}>
        <div className={styles.logo}>
          Campus <span className={styles.highlight}>Vibe</span>
        </div>

        <h2 className={styles.title}>Sign Up to Campus Vibe</h2>

        <form onSubmit={handleSubmit} className={styles.signUpForm}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              YOUR EMAIL
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          {Array.isArray(fieldErrors) && (
            <p style={{ color: "red", textAlign: "center" }}>
              {fieldErrors
                .filter((err) => err.path === "email")
                .map((err, idx) => `• ${err.msg}`)
                .join(" ")}
            </p>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          {Array.isArray(fieldErrors) && (
            <p style={{ color: "red", textAlign: "center" }}>
              {fieldErrors
                .filter((err) => err.path === "password")
                .map((err, idx) => `• ${err.msg}`)
                .join(" ")}
            </p>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              CONFIRM PASSWORD
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          {Array.isArray(fieldErrors) && (
            <p style={{ color: "red", textAlign: "center" }}>
              {fieldErrors
                .filter((err) => err.path === "confirmPassword")
                .map((err, idx) => `• ${err.msg}`)
                .join(" ")}
            </p>
          )}

          <button
            type="submit"
            className={styles.signUpButton}
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>

          {error ? (
            <p style={{ color: "red", textAlign: "center" }}>{error}</p>
          ) : null}

          <div className={styles.divider}>
            <span>Or</span>
          </div>

          <button type="button" className={styles.googleButton}>
            Sign up with Google
          </button>
        </form>
      </div>
    </div>
  );
}
