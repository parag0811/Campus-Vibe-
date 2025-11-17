"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export default function Admin() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 450);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    // Default landing for all admins = Events.
    router.replace("/admin/events");
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.headerAdmin}>
        <h1 className={styles.title}>
          Admin Dashboard <span className={styles.brandName}>Campus Vibe</span>
        </h1>
        <p className={styles.subtitle}>
          {isMobile
            ? "Manage your organisation, events and admins from one place."
            : "Manage your organisation profile, create events, and assign admins — all from the left sidebar."}
        </p>
      </div>

      <div className={styles.actionSection}>
        <div className={styles.actionCard}>
          <h2 className={styles.actionTitle}>How this dashboard works</h2>
          <p className={styles.actionDescription}>
            Use the sidebar to access each section. Updates are saved to your
            organisation and reflected across the app.
          </p>

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <strong>Organisation</strong> — Update organisation logo, name and
              details.{" "}
              <Link href="/admin/organisation" className={styles.miniLink}>
                Go to Organisation
              </Link>
            </li>
            <li className={styles.featureItem}>
              <strong>Events</strong> — Create and manage events, edit info and
              view analytics.{" "}
              <Link href="/admin/events" className={styles.miniLink}>
                Create an Event
              </Link>
            </li>
            <li className={styles.featureItem}>
              <strong>Admins</strong> — Assign or remove admins for events.{" "}
              <Link href="/admin/admins" className={styles.miniLink}>
                Manage Admins
              </Link>
            </li>
          </ul>

          <p className={styles.featureHint}>
            Tip: You can return here anytime for a quick overview.
          </p>
        </div>
      </div>

      <div className={styles.statsPreview}>
        <p className={styles.statsText}>
          Ready to build great campus experiences?
        </p>
      </div>
    </div>
  );
}
