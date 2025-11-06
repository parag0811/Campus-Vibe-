"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./my-events.module.css";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MyEventsPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [tickets, setTickets] = useState([]);

  const redirectedRef = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // Fetch registered events
        const evRes = await fetch(`${API_BASE}/my-events`, {
          credentials: "include",
          signal: ac.signal,
        });

        if (evRes.status === 401) {
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            toast.error("Please login to view your events.");
            router.replace("/login");
          }
          return;
        }

        const evJson = await evRes.json();
        if (!evRes.ok || !evJson?.success) {
          throw new Error(evJson?.message || "Failed to load events");
        }
        const evData = evJson.data || { upcoming: [], past: [] };

        // Fetch tickets
        const tkRes = await fetch(`${API_BASE}/payment/my-tickets`, {
          credentials: "include",
          signal: ac.signal,
        });

        if (tkRes.status === 401) {
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            toast.error("Please login to view your tickets.");
            router.push("/login");
          }
          return;
        }

        const tkJson = await tkRes.json();
        if (!tkRes.ok || !tkJson?.success) {
          throw new Error(tkJson?.message || "Failed to load tickets");
        }

        if (!cancelled) {
          setEvents({
            upcoming: Array.isArray(evData.upcoming) ? evData.upcoming : [],
            past: Array.isArray(evData.past) ? evData.past : [],
          });
          setTickets(Array.isArray(tkJson.data) ? tkJson.data : []);
        }
      } catch (err) {
        if (!cancelled && !ac.signal.aborted) {
          toast.error(err.message || "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []); 

  const toId = (v) => (v && v._id) ? String(v._id) : String(v);

  const ticketByEventId = useMemo(() => {
    const map = new Map();
    tickets.forEach((t) => map.set(toId(t.eventId), t));
    return map;
  }, [tickets]);

  const renderEventCard = (ev) => {
    const t = ticketByEventId.get(toId(ev));
    return (
      <div key={ev._id} className={styles.card}>
        <div className={styles.media}>
          {ev.imageUrl ? (
            <img src={ev.imageUrl} alt={ev.title || "Event"} className={styles.poster} />
          ) : (
            <div className={styles.posterFallback}>{(ev.title || "E").slice(0, 1)}</div>
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{ev.title}</h3>
            {ev.price > 0 ? (
              <span className={styles.pricePaid}>₹{ev.price}</span>
            ) : (
              <span className={styles.priceFree}>Free</span>
            )}
          </div>
          <div className={styles.meta}>
            <span className={styles.date}>
              {formatDateRange(ev.start_date, ev.end_date)}
            </span>
            {ev.organisation?.name && (
              <span className={styles.org}>• {ev.organisation.name}</span>
            )}
          </div>

          <div className={styles.ticketRow}>
            {t ? (
              <>
                <div className={styles.ticketInfo}>
                  <span className={styles.badge}>Ticket</span>
                  <span className={styles.ticketText}>
                    Booking ID: <strong>{t.bookingId}</strong>
                  </span>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={() =>
                      router.push(
                        `/payment/success?bookingId=${encodeURIComponent(t.bookingId)}`
                      )
                    }
                  >
                    View Ticket
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.ticketInfo}>
                <span className={styles.badgeMuted}>No ticket</span>
                <span className={styles.ticketTextMuted}>
                  You’re registered for this event.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} /> Loading your events...
        </div>
      </div>
    );
  }

  const hasUpcoming = (events.upcoming || []).length > 0;
  const hasPast = (events.past || []).length > 0;
  const isEmpty = !hasUpcoming && !hasPast;

  return (
    <div className={`${styles.container} ${isEmpty ? styles.containerEmpty : ""}`}>
      <header className={`${styles.header} ${isEmpty ? styles.headerCenter : ""}`}>
        <h1 className={isEmpty ? styles.h1Empty : styles.h1}>My Events</h1>
        <p className={isEmpty ? styles.subEmphasis : styles.sub}>
          Your registrations and tickets in one place.
        </p>
      </header>

      {isEmpty ? (
        <div className={`${styles.empty} ${styles.emptyCentered}`}>
          <p className={styles.emptyText}>You haven’t registered for any events yet.</p>
          <button className={styles.btnPrimary} onClick={() => router.push("/events")}>
            Browse Events
          </button>
        </div>
      ) : (
        <>
          {hasUpcoming && (
            <section className={styles.section}>
              <h2 className={styles.h2}>Upcoming</h2>
              <div className={styles.grid}>{events.upcoming.map(renderEventCard)}</div>
            </section>
          )}
          {hasPast && (
            <section className={styles.section}>
              <h2 className={styles.h2}>Past</h2>
              <div className={styles.grid}>{events.past.map(renderEventCard)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = end ? formatDate(end) : null;
  return e ? `${s} → ${e}` : s;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date)) return "N/A";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}