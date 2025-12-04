"use client";

import styles from "./contact.module.css";
import Link from "next/link";

export default function ContactPage() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          Get in <span className={styles.purple}>touch</span>
        </h1>
        <p className={styles.subtitle}>
          We’d love to hear from you. For any questions, collaborations, or support,
          drop us a line and we’ll get back to you.
        </p>

        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <a
              className={styles.value}
              href="mailto:campusvibeofficial@gmail.com"
              aria-label="Email Campus Vibe"
            >
              campusvibeofficial@gmail.com
            </a>
          </div>

          <div className={styles.rowNote}>
            Prefer socials? Head to{" "}
            <Link href="/about" className={styles.link}>
              About
            </Link>{" "}
            for more ways to reach us.
          </div>
        </div>
      </div>
    </section>
  );
}