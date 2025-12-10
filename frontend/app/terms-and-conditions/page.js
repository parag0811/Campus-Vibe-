"use client";
import React from "react";
import styles from "./tnc.module.css";

const TermsPage = () => {
  const updated = new Date().toLocaleDateString("en-GB");
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <section className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Terms &amp; Conditions — CampusVibe</h1>
            <p className={styles.subtitle}>Last updated: {updated}</p>
          </div>

          <div className={styles.card}>
            <p>
              These Terms &amp; Conditions govern your use of CampusVibe. By accessing or registering on our website, you agree to follow these terms.
            </p>

            <h3 className={styles.h3}>1. Platform Overview</h3>
            <p>CampusVibe is an event management and ticketing platform built for college communities. Users can explore events, register, and purchase tickets. Organisations can host events using their accounts.</p>

            <h3 className={styles.h3}>2. User Responsibilities</h3>
            <ul className={styles.list}>
              <li>Provide accurate and truthful information.</li>
              <li>Do not misuse or disrupt the platform.</li>
              <li>Do not engage in fraudulent activities.</li>
              <li>Abide by event-specific rules set by organisers.</li>
            </ul>

            <h3 className={styles.h3}>3. Event Organisers</h3>
            <ul className={styles.list}>
              <li>Provide accurate event information.</li>
              <li>Ensure organisation details are correct.</li>
              <li>Supply a valid UPI ID for payouts.</li>
              <li>Follow CampusVibe guidelines.</li>
            </ul>
            <p className={styles.note}>CampusVibe is not liable for incorrect or misleading event details provided by organisers.</p>

            <h3 className={styles.h3}>4. Payments</h3>
            <p>All paid events use Razorpay for payment processing. By making a payment you agree to provide accurate billing information and accept Razorpay’s terms during payment. CampusVibe does not store your payment card or UPI details. Successful payment results in digital ticket generation.</p>

            <h3 className={styles.h3}>5. Ticket Delivery</h3>
            <p>Tickets are delivered digitally via the user’s CampusVibe account and by confirmation email sent through Brevo.</p>

            <h3 className={styles.h3}>6. Refunds</h3>
            <p><strong>No refunds are allowed.</strong> By purchasing a ticket you acknowledge that purchases are final unless an organiser or CampusVibe explicitly states otherwise in their event's refund policy.</p>

            <h3 className={styles.h3}>7. Miscellaneous</h3>
            <p>We may suspend or terminate accounts that breach these terms. We may update these Terms &amp; Conditions; material changes will be communicated.</p>

            <h3 className={styles.h3}>8. Contact</h3>
            <p>For queries:</p>
            <p>
              <strong>Email:</strong> <a className={styles.link} href="mailto:campusvibeofficial@gmail.com">campusvibeofficial@gmail.com</a><br />
              <strong>Owner:</strong> Parag Rangankar
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;
