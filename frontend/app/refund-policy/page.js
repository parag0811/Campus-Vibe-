"use client";
import React from "react";
import styles from "./refund.module.css";

const RefundPolicy = () => {
  const updated = new Date().toLocaleDateString("en-GB");
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <section className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Refund &amp; Cancellation Policy — CampusVibe</h1>
            <p className={styles.subtitle}>Last updated: {updated}</p>
          </div>

          <div className={styles.card}>
            <p>This policy explains how refunds are handled for events on CampusVibe.</p>

            <h3 className={styles.h3}>1. When Refunds Are Allowed</h3>
            <p>Refunds may be provided if:</p>
            <ul className={styles.list}>
              <li>The organiser cancels the event</li>
              <li>The event is rescheduled</li>
              <li>Duplicate or accidental payments occurred</li>
              <li>Payment was successful but a ticket was not generated</li>
            </ul>

            <h3 className={styles.h3}>2. Non-Refundable Situations</h3>
            <p>Refunds are NOT available when:</p>
            <ul className={styles.list}>
              <li>You change your mind</li>
              <li>You enter incorrect details</li>
              <li>You fail to attend the event</li>
              <li>The organiser declines the refund</li>
            </ul>
            <p className={styles.note}>CampusVibe assists with refund processing; the final decision often lies with the organiser.</p>

            <h3 className={styles.h3}>3. Refund Method</h3>
            <p>Refunds for Razorpay payments are returned through Razorpay. Processing typically takes 5–7 business days and depends on your bank/UPI provider.</p>

            <h3 className={styles.h3}>4. How to Request a Refund</h3>
            <p>Send an email to <a className={styles.link} href="mailto:campusvibeofficial@gmail.com">campusvibeofficial@gmail.com</a> including:</p>
            <ul className={styles.list}>
              <li>Full name</li>
              <li>Payment ID</li>
              <li>Order ID</li>
              <li>Event name</li>
              <li>Reason for refund</li>
            </ul>
            <p>We will coordinate with the organiser to process your request.</p>

            <h3 className={styles.h3}>5. Event Organiser Cancellations</h3>
            <p>If an organiser cancels or postpones an event users will be notified by email. Refunds may be processed automatically or manually depending on organiser settings.</p>

            <h3 className={styles.h3}>6. Contact</h3>
            <p>For any refund-related concerns email: <a className={styles.link} href="mailto:campusvibeofficial@gmail.com">campusvibeofficial@gmail.com</a></p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RefundPolicy;
