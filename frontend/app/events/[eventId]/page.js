"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import styles from "./EventDetail.module.css";

const EventDetailPage = () => {
  const [event, setEvent] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // Extract eventId from params (Next.js dynamic route)
  const { eventId } = useParams();
  console.log(eventId);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/eventDetail/${eventId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.status}`);
        }

        const data = await response.json();
        setEvent(data.event);
        setOrganisation(data.event?.created_by_organisation);
      } catch (err) {
        setError(
          err.message || "Something went wrong while fetching event details"
        );
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleRegistration = async () => {
    if (!eventId) return;

    try {
      setIsRegistering(true);

      const response = await fetch(
        `http://localhost:5000/eventRegistration/${eventId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      alert(data.message || "Registration successful!");
      // Optionally refresh event data to show updated attendee count
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
      console.error("Registration error:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isRegistrationOpen = () => {
    if (!event) return false;
    const now = new Date();
    const deadline = new Date(event.registeration_deadline);
    return now < deadline;
  };

  const isFree = () => event?.price === 0;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Error Loading Event</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryBtn}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section
        className={styles.heroSection}
        style={{
          backgroundImage: event.posterImage
            ? `linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8)), url(${event.posterImage})`
            : undefined,
        }}
      >
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <button className={styles.backBtn} onClick={() => router.back()}>
              ← Back
            </button>
            <h1 className={styles.heroTitle}>{event.title}</h1>
            <div className={styles.organizerInfo}>
              <h3 className={styles.organizerName}>
                {organisation?.name || "Event Organizer"}
              </h3>
              <p className={styles.organizerDesc}>{event.description}</p>
            </div>
            <button className={styles.viewMapBtn}>📍 {event.venue}</button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className={styles.contentSection}>
        <div className={styles.contentWrapper}>
          <div className={styles.leftContent}>
            <div className={styles.descriptionSection}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <div className={styles.descriptionText}>
                <p>{event.description}</p>
              </div>
            </div>

            <div className={styles.eventDetailsSection}>
              <h2 className={styles.sectionTitle}>Event Details</h2>
              <div className={styles.eventDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mode:</span>
                  <span className={styles.detailValue}>
                    {event.mode.charAt(0).toUpperCase() + event.mode.slice(1)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Venue:</span>
                  <span className={styles.detailValue}>{event.venue}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Price:</span>
                  <span className={styles.detailValue}>
                    {isFree() ? "Free" : `₹${event.price}`}
                  </span>
                </div>
                {event.max_attendees && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Max Attendees:</span>
                    <span className={styles.detailValue}>
                      {event.max_attendees}
                    </span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Current Attendees:</span>
                  <span className={styles.detailValue}>
                    {event.attendees?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.contactSection}>
              <h2 className={styles.sectionTitle}>Organizer Contact</h2>
              <p>
                {event.organiser_contact
                  ? `Contact: ${event.organiser_contact}`
                  : "Contact details will be provided upon registration"}
              </p>
            </div>
          </div>

          <div className={styles.rightContent}>
            <div className={styles.heroRight}>
              <div className={styles.eventCard}>
                <div className={styles.dateTimeSection}>
                  <h3 className={styles.sectionTitle}>Date & time</h3>
                  <p className={styles.dateTime}>
                    {formatDate(event.start_date)},{" "}
                    {formatTime(event.start_date)}
                  </p>
                  <p className={styles.endTime}>
                    Ends: {formatDate(event.end_date)},{" "}
                    {formatTime(event.end_date)}
                  </p>
                  <button className={styles.addCalendarBtn}>
                    Add to calendar
                  </button>
                </div>
                <button
                  className={styles.bookNowBtn}
                  onClick={handleRegistration}
                  disabled={!isRegistrationOpen() || isRegistering}
                >
                  {isRegistering
                    ? "Registering..."
                    : !isRegistrationOpen()
                    ? "Registration Closed"
                    : isFree()
                    ? "Register Now"
                    : `Register - ₹${event.price}`}
                </button>
                <div className={styles.registrationInfo}>
                  <p className={styles.deadline}>
                    Registration Deadline:{" "}
                    {formatDate(event.registeration_deadline)}
                  </p>
                  {event.max_attendees && (
                    <p className={styles.availability}>
                      {event.max_attendees - (event.attendees?.length || 0)}{" "}
                      spots remaining
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.tagsSection}>
              <h3 className={styles.sectionTitle}>Tags</h3>
              <div className={styles.tags}>
                <span className={styles.tag}>{event.mode} event</span>
                <span className={styles.tag}>{isFree() ? "Free" : "Paid"}</span>
                <span className={styles.tag}>
                  {organisation?.name?.toLowerCase() || "event"}
                </span>
              </div>
            </div>

            <div className={styles.shareSection}>
              <h3 className={styles.sectionTitle}>Share with friends</h3>
              <div className={styles.socialButtons}>
                <button className={styles.socialBtn + " " + styles.facebook}>
                  f
                </button>
                <button className={styles.socialBtn + " " + styles.whatsapp}>
                  W
                </button>
                <button className={styles.socialBtn + " " + styles.linkedin}>
                  in
                </button>
                <button className={styles.socialBtn + " " + styles.twitter}>
                  t
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventDetailPage;
