"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../payment.module.css";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");
  const ticketId = params.get("ticketId");
  const eventId = params.get("eventId");

  return (
    <main className={styles.wrapper}>
      <div className={styles.card + " " + styles.success}>
        <h1 className={styles.title}>Payment successful</h1>
        <p className={styles.sub}>
          Your registration is confirmed. Keep your booking ID safe.
        </p>

        <div className={styles.kv}>
          <div>
            <span className={styles.k}>Booking ID</span>
            <span className={styles.v}>{bookingId || "-"}</span>
          </div>
          {ticketId && (
            <div>
              <span className={styles.k}>Ticket</span>
              <span className={styles.v}>{ticketId}</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {eventId && (
            <Link href={`/events/${eventId}`} className={`${styles.btn} ${styles.primary}`}>
              View event
            </Link>
          )}
          <Link href="/events" className={`${styles.btn} ${styles.secondary}`}>
            Browse more events
          </Link>
        </div>
      </div>
    </main>
  );
}