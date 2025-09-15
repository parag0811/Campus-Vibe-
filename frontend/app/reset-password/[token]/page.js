"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./resetPassword.module.css";

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Extract token from URL path
    const pathToken = window.location.pathname.split("/").pop();
    if (pathToken) {
      setToken(pathToken);
    }
  }, []);

  const validatePassword = (password) => {
    const errors = {};

    // Check if password is empty
    if (!password || password.trim() === "") {
      errors.password = "Password cannot be an empty field.";
      return errors;
    }

    // Check length (8-18 characters)
    if (password.length < 8 || password.length > 18) {
      errors.password = "Password must be 8-18 characters long.";
      return errors;
    }

    // Check for at least one uppercase character
    if (!/[A-Z]/.test(password)) {
      errors.password =
        "Password must contain atleast one uppercase character.";
      return errors;
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain atleast one number.";
      return errors;
    }

    return errors;
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate password
    const passwordErrors = validatePassword(password);
    Object.assign(newErrors, passwordErrors);

    // Validate confirm password
    if (!confirmPassword || confirmPassword.trim() === "") {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch(`${baseUrl}/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password, confirmPassword }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        if (res.status === 400) {
          setErrors({
            general:
              "Invalid or expired reset token. Please request a new password reset.",
          });
        } else {
          setErrors({
            general: data.msg || "Something went wrong. Please try again.",
          });
        }
      }
    } catch (error) {
      setErrors({
        general: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Clear errors when user starts typing
    if (errors.password || errors.general) {
      setErrors((prev) => ({
        ...prev,
        password: "",
        general: "",
      }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    // Clear error when user starts typing
    if (errors.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "",
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Helper function to check password strength criteria
  const getPasswordStrengthStatus = () => {
    return {
      length: password.length >= 8 && password.length <= 18,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      match: password && confirmPassword && password === confirmPassword,
    };
  };

  const strengthStatus = getPasswordStrengthStatus();

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <div className={styles.successIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
          </div>
          <h1 className={styles.title}>Password Reset Successful!</h1>
          <p className={styles.successMessage}>
            Your password has been successfully reset. You can now log in with
            your new password.
          </p>
          <p className={styles.instructions}>
            Redirecting you to login page in a few seconds...
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className={styles.loginButton}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <div className={styles.icon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
              <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"></path>
            </svg>
          </div>
          <h1 className={styles.title}>Reset Your Password</h1>
          <p className={styles.subtitle}>
            Enter your new password below. Make sure it's strong and secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.general && (
            <div className={styles.generalError}>{errors.general}</div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              New Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                className={`${styles.input} ${
                  errors.password ? styles.inputError : ""
                }`}
                placeholder="Enter your new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggle}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm New Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={`${styles.input} ${
                  errors.confirmPassword ? styles.inputError : ""
                }`}
                placeholder="Confirm your new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className={styles.passwordToggle}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>

          <div className={styles.passwordStrength}>
            <p className={styles.strengthLabel}>Password must:</p>
            <ul className={styles.strengthList}>
              <li
                className={
                  strengthStatus.length
                    ? styles.strengthMet
                    : styles.strengthUnmet
                }
              >
                Be 8-18 characters long
              </li>
              <li
                className={
                  strengthStatus.uppercase
                    ? styles.strengthMet
                    : styles.strengthUnmet
                }
              >
                Contain at least one uppercase character
              </li>
              <li
                className={
                  strengthStatus.number
                    ? styles.strengthMet
                    : styles.strengthUnmet
                }
              >
                Contain at least one number
              </li>
              <li
                className={
                  strengthStatus.match
                    ? styles.strengthMet
                    : styles.strengthUnmet
                }
              >
                Match the confirmation password
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className={`${styles.submitButton} ${
              isLoading ? styles.submitButtonLoading : ""
            }`}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Remember your password?{" "}
            <a href="/login" className={styles.link}>
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
