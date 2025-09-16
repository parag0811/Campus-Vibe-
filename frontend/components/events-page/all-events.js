"use client";
import { useState, useEffect } from "react";
import styles from "./all-events.module.css";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventCard = ({ id, image, title, date, time, type }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/events/${id}`);
  };

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
          <p className={styles.eventType}>{type ? `${type} - Attend anywhere` : "Attend anywhere"}</p>
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
          // If backend says "no events", show that message in UI, not as toast
          if (response.status === 404 && data.message) {
            setEvents([]);
            setNoEventsMessage(data.message);
            return;
          }
          // For other errors, show toast
          throw new Error(data.message || "Unable to load events. Please try again later.");
        }

        setEvents(data.events || []);
      } catch (err) {
        setNoEventsMessage("");
        toast.error(err.message || "Unable to load events. Please try again later.");
      }
    };

    fetchEvents();
    // Only run once on mount
    // eslint-disable-next-line
  }, []);

  const loadMore = () => {
    setVisibleEvents((prevVisible) => prevVisible + 6);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Events <span className={styles.purple}>around you</span>
        </h2>
      </div>

      <div className={styles.eventsGrid}>
        {noEventsMessage && (
          <div className={styles.noEventsMessage}>
            {noEventsMessage}
          </div>
        )}
        {events.length === 0 && !noEventsMessage && (
          <div className={styles.noEventsMessage}>
            No events found.
          </div>
        )}
        {events.slice(0, visibleEvents).map((event) => (
          <EventCard
            id={event._id}
            key={event._id}
            image={event.image}
            title={event.title}
            location={event.location}
            date={event.date}
            time={event.time}
            type={event.type}
          />
        ))}
      </div>

      {/* Pagination or Load More */}
      {events.length > visibleEvents && (
        <div className={styles.paginationContainer}>
          <button
            className={styles.paginationButton}
            onClick={loadMore}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
