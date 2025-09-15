"use client";
import styles from "./events.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Alert from "@/components/alert/alert.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventsDashboard = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: "info", message: "" });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch organisation info
        const orgRes = await fetch(`${API_BASE}/organisationAdmin/my-organisation`, {
          credentials: "include",
        });
        if (!orgRes.ok) throw new Error("Failed to fetch organisation info.");
        const org = await orgRes.json();
        const organisationId = org?.organisation?._id;
        if (!organisationId) throw new Error("Organisation not found.");

        setOrgId(organisationId);

        // Fetch events for organisation
        const eventsRes = await fetch(`${API_BASE}/organisation/${organisationId}/createdEvents`, {
          credentials: "include",
        });
        if (!eventsRes.ok) throw new Error("Failed to fetch events.");
        const data = await eventsRes.json();
        setEvents(data.events || []);
      } catch (err) {
        setError(err.message || "Something went wrong.");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: "info", message: "" }), 4000);
  };

  const handleCreateEvent = () => {
    router.push("/admin/events/create-event");
  };

  const handleEditEvent = (eventId) => {
    router.push(`/admin/events/create-event?edit=${eventId}`);
  };

  const handleViewAnalytics = (eventId) => {
  router.push(`/admin/events/event-analytics?event=${eventId}&org=${orgId}`);
  };

  return (
    <div className={styles.container}>
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "info", message: "" })}
          autoClose={true}
          duration={4000}
        />
      )}

      {/* Hero Section */}
      <div
        className={styles.heroSection}
        style={{
          backgroundImage: `url("/eventDashboardBg.svg")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Create and share
              <br />
              extraordinary events
              <br />
              with the world
            </h1>
            <p className={styles.heroSubtitle}>
              Step into the world of events. Start creating
              <br />
              unforgettable experiences and share them with the community!
            </p>
            <div className={styles.heroButtons}>
              <button className={styles.discoverBtn} onClick={handleCreateEvent}>
                Create Event
              </button>
              {/* <button className={styles.watchBtn}>Watch video</button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Your Events Section */}
      <div className={styles.eventsSection}>
        <h2 className={styles.sectionTitle}>Your Events</h2>
        {loading ? (
          <p>Loading events...</p>
        ) : error ? (
          <p className={styles.errorText}>{error}</p>
        ) : events.length === 0 ? (
          <p>No events found for your organisation.</p>
        ) : (
          <div className={styles.eventsGrid}>
            {events.map((event) => (
              <div key={event._id} className={styles.eventCard}>
                <div className={styles.eventImageContainer}>
                  <img
                    src={event.imageUrl || "/default-event.jpg"}
                    alt={event.title}
                    className={styles.eventImage}
                  />
                  {/* Remove favorite button if not used */}
                </div>
                <div className={styles.eventContent}>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDate}>
                    {new Date(event.registeration_deadline).toLocaleDateString()}
                  </p>
                  <div className={styles.eventFooter}>
                    <button
                      className={styles.analyticsBtn}
                      onClick={() => handleViewAnalytics(event._id)}
                    >
                      View Analytics
                    </button>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEditEvent(event._id)}
                    >
                      Edit Event
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsDashboard;
