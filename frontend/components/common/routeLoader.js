"use client";
import { useEffect, useState } from "react";
import styles from "./routeLoader.module.css";

const LoadingSpinner = ({ isLoading = true, message = "Loading..." }) => {
  const [dots, setDots] = useState("");
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles only once on client
    const newParticles = [...Array(12)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots((prev) => (prev === "..." ? "" : prev + "."));
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinnerContent}>
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerOuter}></div>
          <div className={styles.spinnerInner}></div>
          <div className={styles.spinnerCore}></div>
        </div>

        <div className={styles.messageContainer}>
          {message}
          {dots}
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressIndicator}></div>
        </div>
      </div>

      {/* Reduced particles */}
      <div className={styles.particlesContainer}>
        {particles.map((p, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;
