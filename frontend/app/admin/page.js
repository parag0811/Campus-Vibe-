"use client";
import { useState, useEffect } from "react";
import styles from "./admin.module.css";

export default function Admin() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 450);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.headerAdmin}>
        <h1 className={styles.title}>
          Welcome to the Admin Dashboard of{" "}
          <span className={styles.brandName}>Campus Vibe</span>
        </h1>
        <p className={styles.subtitle}>
          {isMobile
            ? "Build connections & manage events"
            : "Transform your campus events and build lasting connections"}
        </p>
      </div>

      <div className={styles.actionSection}>
        <div className={styles.actionCard}>
          <h2 className={styles.actionTitle}>
            {isMobile
              ? "Create Organization"
              : "First, Create Your Organization"}
          </h2>
          <p className={styles.actionDescription}>
            {isMobile
              ? "Set up your profile to start managing campus events."
              : "Set up your organization profile to get started with managing campus events and connecting with students."}
          </p>
          <button
            className={styles.actionButton}
            onClick={() => (window.location.href = "/admin/organisation")}
          >
            Create Organization
          </button>
        </div>
      </div>

      <div className={styles.statsPreview}>
        <p className={styles.statsText}>
          {isMobile
            ? "Ready to get started?"
            : "Ready to boost campus engagement? Your journey starts here."}
        </p>
      </div>
    </div>
  );
}
