"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../payment.module.css";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");
  const ticketId = params.get("ticketId");
  const eventId = params.get("eventId");

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;
    if (!bookingId) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/payment/ticket/${encodeURIComponent(bookingId)}`,
          {
            credentials: "include",
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load ticket");
        }
        if (!canceled) setDetail(json.data);
      } catch (e) {
        if (!canceled) setDetail(null);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [bookingId]);

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

        {detail?.event && (
          <div className={styles.eventDetails}>
            <h2 className={styles.eventTitle}>{detail.event.title}</h2>
            <p className={styles.organisationName}>
              {detail.organisation.name}
            </p>
          </div>
        )}

        <div className={styles.actions}>
          {eventId && (
            <Link
              href={`/events/${eventId}`}
              className={`${styles.btn} ${styles.primary}`}
            >
              View event
            </Link>
          )}
          <Link
            href="/events"
            className={`${styles.btn} ${styles.secondary}`}
          >
            Browse more events
          </Link>
        </div>
      </div>
    </main>
  );
}