"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./featured-events.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventCard = ({ id, image, title, date, time, orgName }) => {
  return (
    <div className={styles.cardWrapper}>
      <Link
        href={`/events/${id}`}
        className={styles.cardLink}
        aria-label={`${title} details`}
      >
        <div className={styles.card}>
          <div className={styles.imageContainer}>
            <img src={image} alt={title} className={styles.image} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.eventTitle}>{title}</h3>
            <p className={styles.eventDate}>
              {date}, {time}
            </p>
            <p className={styles.eventType}>{orgName || "Organisation"}</p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/events`, { credentials: "include" });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data?.events) ? data.events : [];

        const fmt = (d, opts) => new Date(d).toLocaleString(undefined, opts);

        const mapped = list.slice(0, 12).map((ev) => {
          const start = ev.start_date || ev.createdAt || Date.now();
          const date = fmt(start, { weekday: "long", month: "long", day: "numeric" });
          const time = fmt(start, { hour: "numeric", minute: "2-digit" });
          return {
            id: ev._id,
            image: ev.imageUrl || "/default-event.jpg",
            title: ev.title || "Untitled event",
            date,
            time,
            orgName: ev?.organisation?.name || ev?.created_by_organisation?.name || "Organisation",
          };
        });

        if (!cancel) setEvents(mapped);
      } catch {
        if (!cancel) setEvents([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Upcoming <span className={styles.purple}>Events</span>
        </h2>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : events.length === 0 ? (
        <div>No events available right now.</div>
      ) : (
        <div className={styles.eventsGrid}>
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              image={event.image}
              title={event.title}
              date={event.date}
              time={event.time}
              orgName={event.orgName}
            />
          ))}
        </div>
      )}

      <div className={styles.loadMoreContainer}>
        <Link href="/events" className={styles.loadMoreButton}>
          Explore more
        </Link>
      </div>
    </div>
  );
}
