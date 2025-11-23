"use client";
import styles from "./events.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== "undefined" && !API_BASE) {
  console.warn("NEXT_PUBLIC_API_URL missing. Events dashboard will not load.");
}

const EventsDashboard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    const load = async () => {
      if (!API_BASE) {
        setError("API base not configured.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const probeRes = await fetch(`${API_BASE}/org-admin/organisation/is-member`, {
          credentials: "include",
          signal: ac.signal,
          headers: { "Cache-Control": "no-cache" },
        });
        if (probeRes.status === 401) {
          toast.info("Please login to manage events.");
          router.replace("/login");
          return;
        }
        const probe = await probeRes.json();
        if (!probeRes.ok || !probe?.orgAdmin || !probe?.organisationId) {
          router.push("/create-organisation");
          return;
        }
        const organisationId = String(probe.organisationId);
        setOrgId(organisationId);

        const eventsRes = await fetch(
          `${API_BASE}/org-admin/organisation/${organisationId}/created-events`,
          { credentials: "include", signal: ac.signal, headers: { "Cache-Control": "no-cache" } }
        );

        if (eventsRes.status === 401) {
          toast.info("Please login to manage events.");
          router.replace("/login");
          return;
        }
        if (eventsRes.status === 404) {
          setEvents([]);
          return;
        }
        if (!eventsRes.ok) {
          const data = await eventsRes.json().catch(() => ({}));
            throw new Error(data?.message || "Failed to fetch events.");
        }
        const data = await eventsRes.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err.message || "Failed to load events.");
        setEvents([]);
        toast.error(err.message || "Failed to load events");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => ac.abort();
  }, [router, toast]);

  const handleCreateEvent = () => router.push("/admin/events/create-event");
  const handleEditEvent = (id) => router.push(`/admin/events/create-event?edit=${id}`);
  const handleViewAnalytics = (id) =>
    router.push(`/admin/events/event-analytics?event=${id}&org=${orgId}`);

  return (
    <div className={styles.container}>
      <div
        className={styles.heroSection}
        style={{
          backgroundImage: 'url("/eventDashboardBg.svg")',
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
            </div>
          </div>
        </div>
      </div>

      <div className={styles.eventsSection}>
        <h2 className={styles.sectionTitle}>Your Events</h2>
        {loading ? (
          <p>Loading events...</p>
        ) : error ? (
          <p className={styles.errorText}>{error}</p>
        ) : events.length === 0 ? (
          <p className={styles.emptyText}>No events found for your organisation.</p>
        ) : (
          <div className={styles.eventsGrid}>
            {events.map((event) => (
              <div key={event._id} className={styles.eventCard}>
                <div className={styles.eventImageContainer}>
                  <img
                    src={event.imageUrl || "/default-event.jpg"}
                    alt={event.title || "Event poster"}
                    className={styles.eventImage}
                    loading="lazy"
                  />
                </div>
                <div className={styles.eventContent}>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDate}>
                    {event.registeration_deadline
                      ? new Date(event.registeration_deadline).toLocaleDateString()
                      : "—"}
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
