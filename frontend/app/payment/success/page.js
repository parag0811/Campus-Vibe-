"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../payment.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingIdQS = params.get("bookingId"); // URL only for request
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState(null); // NEW
  const printRef = useRef(null);

  useEffect(() => {
    let canceled = false;
    if (!bookingIdQS) return;

    (async () => {
      try {
        setLoading(true);
        setErrorCode(null);
        const res = await fetch(
          `${API_BASE}/payment/ticket/${encodeURIComponent(bookingIdQS)}`,
          { credentials: "include" }
        );

        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403 || res.status === 404) {
          if (!canceled) setErrorCode(res.status);
          return;
        }

        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load ticket");
        }
        if (!canceled) setDetail(json.data);
      } catch (_) {
        if (!canceled) setErrorCode("failed");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => { canceled = true; };
  }, [bookingIdQS, router]);

  const onDownload = () => {
    if (!detail) return; // don’t allow printing when unauthorized
    window.print();
  };

  if (loading) {
    return (
      <main className={styles.wrapper}>
        <div className={`${styles.card} ${styles.success}`}>
          <p className={styles.sub}>Loading ticket…</p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className={styles.wrapper}>
        <div className={`${styles.card} ${styles.failed}`}>
          <h1 className={styles.title}>
            {errorCode === 403 ? "Not your ticket" :
             errorCode === 404 ? "Ticket not found" : "Couldn’t load ticket"}
          </h1>
          <div className={`${styles.actions} ${styles.noPrint}`}>
            <Link href="/my-tickets" className={`${styles.btn} ${styles.primary}`}>
              Go to My Tickets
            </Link>
            <Link href="/events" className={`${styles.btn} ${styles.secondary}`}>
              Browse Events
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <div
        id="ticketPrint"
        ref={printRef}
        className={`${styles.card} ${styles.success} ${styles.printCard}`}
      >
        <div className={styles.brandTop}>
          <span className={styles.brandTextCampus}>Campus</span>
          <span className={styles.brandTextVibe}>Vibe</span>
        </div>

        {detail.event && (
          <div className={styles.centerBlock}>
            <h1 className={styles.eventTitleLarge}>{detail.event.title}</h1>
            <p className={styles.organisationName}>
              {detail?.organisation?.name || "—"}
            </p>
          </div>
        )}

        {/* IMPORTANT: use detail.bookingId (from server), not URL param */}
        <div className={styles.kv}>
          <div>
            <span className={styles.k}>Booking ID</span>
            <span className={styles.v}>{detail.bookingId || "-"}</span>
          </div>
          <div>
            <span className={styles.k}>Status</span>
            <span className={styles.v}>{detail.status || "active"}</span>
          </div>
          <div>
            <span className={styles.k}>Issued on</span>
            <span className={styles.v}>
              {detail.issuedAt ? new Date(detail.issuedAt).toLocaleString() : "-"}
            </span>
          </div>
        </div>

        {detail.event?.imageUrl ? (
          <div className={styles.banner}>
            <img src={detail.event.imageUrl} alt={detail.event.title || "Event"} />
          </div>
        ) : null}

        <div className={styles.kv}>
          <div>
            <span className={styles.k}>Amount</span>
            <span className={styles.v}>
              {detail?.payment?.amount
                ? `₹${(Number(detail.payment.amount) / 100).toFixed(2)}`
                : detail?.event?.price > 0
                ? `₹${detail.event.price}`
                : "Free"}
            </span>
          </div>
          <div>
            <span className={styles.k}>Order ID</span>
            <span className={styles.v}>{detail?.payment?.orderId || "—"}</span>
          </div>
          <div>
            <span className={styles.k}>Payment ID</span>
            <span className={styles.v}>{detail?.payment?.paymentId || "—"}</span>
          </div>
        </div>

        <div className={`${styles.actions} ${styles.noPrint}`}>
          {detail?.event?.id && (
            <Link href={`/events/${detail.event.id}`} className={`${styles.btn} ${styles.primary}`}>
              View event
            </Link>
          )}
          <button onClick={onDownload} className={`${styles.btn} ${styles.secondary}`}>
            Download ticket (PDF)
          </button>
          <Link href="/events" className={`${styles.btn} ${styles.secondary}`}>
            Browse more events
          </Link>
        </div>
      </div>
    </main>
  );
}
