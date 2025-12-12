"use client";

import styles from "./shipping.module.css";

export default function ShippingPolicyPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Shipping & Delivery Policy</h1>
      <p className={styles.updated}>Last Updated: 12 Dec 2025</p>

      <section className={styles.section}>
        <p>
          CampusVibe is a digital event management platform created by{" "}
          <strong>Parag Rangankar</strong>, helping users discover and register
          for events across campuses.
        </p>
        <p>
          We do <strong>not</strong> ship any physical goods. All our services
          and deliverables are provided digitally.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>1. Digital Delivery Only</h2>
        <p>CampusVibe provides the following digital services:</p>
        <ul className={styles.list}>
          <li>Online event registrations</li>
          <li>Digital event tickets</li>
          <li>Email confirmations & reminders</li>
          <li>Access to booking history</li>
        </ul>
        <p>
          All services are delivered instantly online or via email to the
          registered user. No physical shipping is involved.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>2. Ticket Delivery</h2>
        <p>
          After successful registration or payment, your ticket is generated
          instantly and available under <strong>My Tickets</strong>. A
          confirmation email is also sent.
        </p>
        <p>
          Tickets are delivered digitally and are <strong>never shipped</strong>{" "}
          as physical items.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>3. Access Issues</h2>
        <p>If you don’t receive your ticket or confirmation email, contact us:</p>

        <ul className={styles.list}>
          <li>Email: campusvibeofficial@gmail.com</li>
          <li>Support: paragrangankar@gmail.com</li>
        </ul>

        <p>We typically respond within 1–2 business hours.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>4. Event Deliverables</h2>
        <p>
          Any event benefits (entry, participation, materials, certificates, etc.)
          are managed by the respective event organisers.
        </p>
        <p>
          CampusVibe only handles booking and does not ship or deliver any items.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>5. Clarification</h2>
        <p>
          This policy explains our digital-only delivery model and must be
          considered the official shipping policy for CampusVibe.
        </p>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} CampusVibe</p>
      </footer>
    </main>
  );
}
