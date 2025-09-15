"use client";
import styles from "./login-panel.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/common/toast";

export default function LoginPanel() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    // Basic required validation
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/auth/login-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      setEmail("");
      setPassword("");
      toast.success(data.message || "Login successful!");
      router.push("/");
    } catch (err) {
      toast.error("Something went wrong. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.logoContainer}>
        <span className={styles.logoText}>
          Campus <span className={styles.highlight}>Vibe</span>
        </span>
      </div>

      <h1 className={styles.formTitle}>Sign In to Campus Vibe</h1>

      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              YOUR EMAIL
            </label>
            <input
              className={styles.input}
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              PASSWORD
            </label>
            <input
              className={styles.input}
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Link href="/forgot-password" className={styles.forgotPassword}>
              Forgot your password?
            </Link>
          </div>

          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.signInButton}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
