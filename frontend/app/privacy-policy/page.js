"use client";
import React from "react";
import styles from "./privacy.module.css";

const PrivacyPolicy = () => {
  const updated = new Date().toLocaleDateString("en-GB");
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <section className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Privacy Policy — CampusVibe</h1>
            <p className={styles.subtitle}>Last updated: {updated}</p>
          </div>

          <div className={styles.card}>
            <p>
              CampusVibe is an event platform for college communities. This policy explains what we collect and why. By using CampusVibe you agree to these practices.
            </p>

            <h3 className={styles.h3}>1. Information We Collect</h3>
            <h4 className={styles.h4}>A. User information</h4>
            <ul className={styles.list}>
              <li>Full name, age, email, college/education details, profile data</li>
              <li>Event registrations and ticket details</li>
            </ul>

            <h4 className={styles.h4}>B. Organisation owner information</h4>
            <ul className={styles.list}>
              <li>Organisation name, contact email, phone/contact details</li>
              <li>UPI ID (for payouts) and other payout-related details submitted by the owner</li>
            </ul>

            <h4 className={styles.h4}>C. Payment &amp; communication</h4>
            <ul className={styles.list}>
              <li>Payments are processed by Razorpay — they may collect card, UPI and transaction data. We do not store card numbers or CVV.</li>
              <li>We use Brevo for sending emails (verification, confirmations, updates); Brevo may collect delivery/technical info.</li>
            </ul>

            <h4 className={styles.h4}>D. Technical data</h4>
            <ul className={styles.list}>
              <li>IP address, device/browser info, cookies and usage logs</li>
            </ul>

            <h3 className={styles.h3}>2. How We Use Data</h3>
            <ul className={styles.list}>
              <li>Create and manage accounts</li>
              <li>Enable organisations to host events and issue tickets</li>
              <li>Process payments via Razorpay</li>
              <li>Send emails via Brevo and provide support</li>
            </ul>
            <p className={styles.note}>We never sell or rent personal data to third parties.</p>

            <h3 className={styles.h3}>3. UPI &amp; Financial Data</h3>
            <p>
              For organisation owners we store UPI IDs to facilitate payouts. We do not store card numbers, CVV, or bank login credentials. Payout details are used only for payouts and account setup.
            </p>

            <h3 className={styles.h3}>4. Security &amp; Rights</h3>
            <p>We use reasonable measures to protect data. You may access, correct, or request deletion of your data — contact us below.</p>

            <h3 className={styles.h3}>5. Children</h3>
            <p>CampusVibe is intended for college-age users (13+). We do not knowingly collect data from minors who are under 13 or under teenage.</p>

            <h3 className={styles.h3}>6. Third-Party Services</h3>
            <p>We use Razorpay (payments), Brevo (emails), and hosting platforms (Vercel / Render). Each has its own policies.</p>

            <h3 className={styles.h3}>7. Changes &amp; Contact</h3>
            <p>We may update this policy; material changes will be communicated. For requests or questions contact:</p>
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

export default PrivacyPolicy;
