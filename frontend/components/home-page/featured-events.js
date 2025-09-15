"use client";
import { useState } from "react";
import styles from "./featured-events.module.css";
import eventcard from "@/assets/eventcard.png";

const EventCard = ({ image, title, location, date, time, type }) => {
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <img src={image} alt={title} className={styles.image} />
          <span className={styles.freeTag}>FREE</span>
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.eventTitle}>{title}</h3>
          <p className={styles.eventDate}>
            {date}, {time}
          </p>
          <p className={styles.eventType}>{type} - Attend anywhere</p>
        </div>
      </div>
    </div>
  );
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState([
    {
      id: 1,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 2,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 3,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 4,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 5,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 6,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
    {
      id: 7,
      image: eventcard,
      title: "BestSeller Book Bootcamp - Write, Market & Publish Your Book",
      location: "Lucknow",
      date: "Saturday, March 18",
      time: "3:30PM",
      type: "ONLINE EVENT",
    },
  ]);

  const [visibleEvents, setVisibleEvents] = useState(6);

  const loadMore = () => {
    setVisibleEvents((prevVisible) => prevVisible + 6);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Upcoming <span className={styles.purple}>Events</span>
        </h2>
      </div>

      <div className={styles.eventsGrid}>
        {events.slice(0, visibleEvents).map((event) => (
          <EventCard
            key={event.id}
            image={event.image.src}
            title={event.title}
            location={event.location}
            date={event.date}
            time={event.time}
            type={event.type}
          />
        ))}
      </div>

      {visibleEvents < events.length && (
        <div className={styles.loadMoreContainer}>
          <button className={styles.loadMoreButton} onClick={loadMore}>
            Load more...
          </button>
        </div>
      )}
    </div>
  );
}
