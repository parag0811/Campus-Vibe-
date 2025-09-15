"use client"
import { useState } from 'react';
import styles from './forgotPassword.module.css';

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    
    // Clear previous error
    setError("");
    
    // Validate email
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.msg || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleBackToLogin = () => {
    // Reset form state
    setIsSubmitted(false);
    setEmail("");
    setError("");
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <div className={styles.successIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.successMessage}>
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className={styles.instructions}>
            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
          </p>
          <button 
            type="button" 
            onClick={handleBackToLogin}
            className={styles.backButton}
          >
            Back to Login
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <circle cx="12" cy="16" r="1"></circle>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className={styles.title}>Forgot your password?</h1>
          <p className={styles.subtitle}>
            No worries! Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleEmailChange}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className={`${styles.submitButton} ${isLoading ? styles.submitButtonLoading : ''}`}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Remember your password?{' '}
            <a href="/login" className={styles.link}>
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
