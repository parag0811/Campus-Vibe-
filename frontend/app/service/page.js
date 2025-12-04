"use client";

import styles from "./service.module.css";

export default function ServicePage() {
  return (
    <section className={styles.container}>
      <h1 className={styles.title}>
        ⭐ Campus<span className={styles.purple}>Vibe</span> Services
      </h1>
      <p className={styles.subtitle}>Services offered by our platform</p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>🎓 Student Services</div>
          <ul className={styles.list}>
            <li>Register for events</li>
            <li>Save events</li>
            <li>Digital ticket</li>
            <li>Past & upcoming event tracking</li>
          </ul>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>🏛️ Organisation Services</div>
          <ul className={styles.list}>
            <li>Create events</li>
            <li>Assign admins</li>
            <li>Manage registrations</li>
            <li>Access analytics</li>
            <li>Organisation dashboard</li>
          </ul>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>💳 Payments & Ticketing</div>
          <ul className={styles.list}>
            <li>Razorpay secure payments</li>
            <li>Instant verification</li>
            <li>Auto-generated tickets</li>
            <li>Email confirmations</li>
          </ul>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>📊 Earnings & Insights</div>
          <ul className={styles.list}>
            <li>Revenue tracking</li>
            <li>Event-level earnings</li>
            <li>Pending payouts</li>
            <li>Platform fee breakdown</li>
          </ul>
        </div>
      </div>
    </section>
  );
}