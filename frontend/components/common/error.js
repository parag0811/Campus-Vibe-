"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./error.module.css";

const ErrorPage = ({
  statusCode = 500,
  title = "Oops! Something went wrong",
  message = "We're having trouble connecting you to Campus Vibe right now.",
  showRetry = true,
  showHome = true,
  onRetry = null,
}) => {
  const [particles, setParticles] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Generate particles for background animation
    const newParticles = [...Array(20)].map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${6 + Math.random() * 4}s`,
      size: `${4 + Math.random() * 12}px`,
    }));
    setParticles(newParticles);
  }, []);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const getErrorTitle = () => {
    switch (statusCode) {
      case 404:
        return "Page Not Found";
      case 403:
        return "Access Denied";
      case 500:
      default:
        return title;
    }
  };

  const getErrorMessage = () => {
    switch (statusCode) {
      case 404:
        return "Sorry, we can't find the page you're looking for.";
      case 403:
        return "You don't have permission to access this resource.";
      case 500:
      default:
        return message;
    }
  };

  return (
    <div className={styles.errorPage}>
      {/* Animated background gradient */}
      <div className={styles.backgroundGradient}></div>

      {/* Background particles */}
      <div className={styles.particlesContainer}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={styles.particle}
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              width: particle.size,
              height: particle.size,
            }}
          />
        ))}
      </div>

      {/* Main error content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <span className={styles.logo}>
            Campus<span className={styles.logoAccent}>Vibe</span>
          </span>
        </div>

        {/* Error info */}
        <h1 className={styles.statusCode}>{statusCode}</h1>
        <h2 className={styles.title}>{getErrorTitle()}</h2>
        <p className={styles.message}>{getErrorMessage()}</p>

        {/* Buttons */}
        <div className={styles.buttonContainer}>
          {showHome && (
            <button onClick={handleGoHome} className={`${styles.button} ${styles.homeButton}`}>
              Back to Home
            </button>
          )}
          
          {showRetry && (
            <button onClick={handleRetry} className={`${styles.button} ${styles.retryButton}`}>
              Try Again
            </button>
          )}
        </div>

        {/* Support text */}
        <p className={styles.supportText}>
          If the problem persists, please contact our support team
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
