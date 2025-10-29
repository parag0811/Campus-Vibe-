"use client";
import { useState, useEffect } from "react";
import styles from "./all-events.module.css";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventCard = ({ id, image, title, date, time, orgName }) => {
  const router = useRouter();
  const handleClick = () => router.push(`/events/${id}`);

  return (
    <div className={styles.cardWrapper} onClick={handleClick}>
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
    </div>
  );
};

export default function AllEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [visibleEvents, setVisibleEvents] = useState(9);
  const [noEventsMessage, setNoEventsMessage] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setNoEventsMessage("");
        const response = await fetch(`${API_BASE}/events`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404 && data.message) {
            setEvents([]);
            setNoEventsMessage(data.message);
            return;
          }
          throw new Error(data.message || "Unable to load events. Please try again later.");
        }

        const list = Array.isArray(data?.events) ? data.events : [];
        const fmt = (d, opts) => new Date(d).toLocaleString(undefined, opts);

        const mapped = list.map((ev) => {
          const start = ev.start_date || ev.createdAt || Date.now();
          return {
            id: ev._id,
            image: ev.imageUrl || "/default-event.jpg",
            title: ev.title || "Untitled event",
            date: fmt(start, { weekday: "long", month: "long", day: "numeric" }),
            time: fmt(start, { hour: "numeric", minute: "2-digit" }),
            orgName: ev?.organisation?.name || ev?.created_by_organisation?.name || "Organisation",
          };
        });

        setEvents(mapped);
      } catch (err) {
        setNoEventsMessage("");
        toast.error(err.message || "Unable to load events. Please try again later.");
      }
    };

    fetchEvents();
  }, []);

  const loadMore = () => setVisibleEvents((prev) => prev + 6);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Events <span className={styles.purple}>around you</span>
        </h2>
      </div>

      <div className={styles.eventsGrid}>
        {noEventsMessage && <div className={styles.noEventsMessage}>{noEventsMessage}</div>}
        {events.length === 0 && !noEventsMessage && (
          <div className={styles.noEventsMessage}>No events found.</div>
        )}

        {events.slice(0, visibleEvents).map((event) => (
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

      {events.length > visibleEvents && (
        <div className={styles.paginationContainer}>
          <button className={styles.paginationButton} onClick={loadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
