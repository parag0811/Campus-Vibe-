"use client";
import { useState, useEffect } from "react";
import styles from "./all-events.module.css";
import { useRouter } from "next/navigation";
import eventcard from "@/assets/eventcard.png";

const EventCard = ({ id, image, title, location, date, time, type }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/events/${id}`);
  };  

  return (
    <div className={styles.cardWrapper} onClick={handleClick}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <img src={image} alt={title} className={styles.image} />
          {/* <span className={styles.freeTag}>FREE</span> */}
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

export default function AllEvents() {
  const [events, setEvents] = useState([]);
  const [visibleEvents, setVisibleEvents] = useState(9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("http://localhost:5000/events"); // Replace with full URL in production
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        console.log(data.events);
        setEvents(data.events || []);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const loadMore = () => {
    setVisibleEvents((prevVisible) => prevVisible + 6);
  };

  // Filter events based on selected filters
  const filteredEvents = events.filter((event) => {
    let matchesFilters = true;

    if (selectedDate && !event.date.includes(selectedDate)) {
      matchesFilters = false;
    }

    if (selectedEventType && event.type !== selectedEventType) {
      matchesFilters = false;
    }

    if (selectedCategory && event.category !== selectedCategory) {
      matchesFilters = false;
    }

    return matchesFilters;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Events <span className={styles.purple}>around you</span>
        </h2>

        <div className={styles.filterContainer}>
          {/* Date Filter Dropdown */}
          <div className={styles.filterDropdown}>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Date/Days</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
            </select>
          </div>

          {/* Event Type Filter Dropdown */}
          <div className={styles.filterDropdown}>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Event type</option>
              <option value="ONLINE EVENT">Online Event</option>
              <option value="IN-PERSON EVENT">In-Person Event</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className={styles.filterDropdown}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Any category</option>
              <option value="Music">Music</option>
              <option value="Art">Art</option>
              <option value="Sports">Sports</option>
              <option value="Food">Food</option>
              <option value="Tech">Tech</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.eventsGrid}>
        {filteredEvents.slice(0, visibleEvents).map((event) => (
          <EventCard
            id={event._id}
            key={event._id}
            // image={event.image.src || eventcard.src}
            title={event.title}
            location={event.location}
            date={event.date}
            time={event.time}
            type={event.type}
          />
        ))}
      </div>

      <div className={styles.paginationContainer}>
        <button className={`${styles.paginationButton} ${styles.activePage}`}>
          1
        </button>
        <button className={styles.paginationButton}>2</button>
        <button className={styles.paginationButton}>3</button>
        <button className={styles.paginationButton}>
          <span className={styles.morePages}>...</span>
        </button>
      </div>
    </div>
  );
}
