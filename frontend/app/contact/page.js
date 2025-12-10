"use client";

import styles from "./contact.module.css";
import Link from "next/link";

export default function ContactPage() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Contact Us — <span className={styles.purple}>CampusVibe</span></h1>

        <p className={styles.subtitle}>
          If you have any questions about registrations, payments, refunds, tickets, organisation onboarding or account assistance — we’re here to help.
        </p>

        <div className={styles.card}>
          <div style={{ marginBottom: 12 }}>
            <strong>Topics we support:</strong>
            <ul style={{ margin: '8px 0 0 20px' }}>
              <li>Event registrations</li>
              <li>Payments</li>
              <li>Refunds</li>
              <li>Ticket issues</li>
              <li>Organisation onboarding</li>
              <li>Account assistance</li>
            </ul>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Primary</span>
            <a className={styles.value} href="mailto:campusvibeofficial@gmail.com">campusvibeofficial@gmail.com</a>
          </div>

          <div className={styles.row} style={{ marginTop: 8 }}>
            <span className={styles.label}>Alternate</span>
            <a className={styles.value} href="mailto:paragrangankar@gmail.com">paragrangankar@gmail.com</a>
          </div>

          <div className={styles.row} style={{ marginTop: 12 }}>
            <span className={styles.label}>Owner</span>
            <span className={styles.value}>Parag Rangankar</span>
          </div>

          <div className={styles.row} style={{ marginTop: 12 }}>
            <span className={styles.label}>Response</span>
            <span className={styles.value}>Within 24–48 hours</span>
          </div>

          <div className={styles.rowNote} style={{ marginTop: 12 }}>
            Prefer socials? Head to <Link href="/about" className={styles.link}>About</Link> for more ways to reach us.
          </div>
        </div>
      </div>
    </section>
  );
}