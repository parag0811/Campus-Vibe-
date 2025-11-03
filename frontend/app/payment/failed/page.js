"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../payment.module.css";

export default function PaymentFailedPage() {
  const params = useSearchParams();
  const eventId = params.get("eventId");

  return (
    <main className={styles.wrapper}>
      <div className={styles.card + " " + styles.failed}>
        <h1 className={styles.title}>Payment failed</h1>
        <p className={styles.sub}>
          Your payment could not be completed. You can retry or explore other events.
        </p>

        <div className={styles.actions}>
          {eventId && (
            <Link href={`/events/${eventId}`} className={`${styles.btn} ${styles.primary}`}>
              Try again
            </Link>
          )}
          <Link href="/events" className={`${styles.btn} ${styles.secondary}`}>
            Back to events
          </Link>
        </div>
      </div>
    </main>
  );
}