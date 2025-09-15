"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./event-analytics.module.css";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventAnalytics = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const organisationId = searchParams.get("org");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId && organisationId) {
      fetchEventAnalytics();
    }
  }, [eventId, organisationId]);

  const fetchEventAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        API_BASE + `/organisation/${organisationId}/event/${eventId}/eventAnalytics`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch analytics");
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchEventAnalytics} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Event Analytics</h1>
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              {analytics?.registerations || 0}
            </span>
            <span className={styles.statLabel}>Total Registrations</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Registered Participants</h2>
            <button
              onClick={fetchEventAnalytics}
              className={styles.refreshButton}
            >
              Refresh Data
            </button>
          </div>

          {analytics?.registered_Users?.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>College Name</th>
                    <th>College ID</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.registered_Users.map((user, index) => (
                    <tr key={index}>
                      <td className={styles.nameCell}>{user.name}</td>
                      <td className={styles.emailCell}>{user.email}</td>
                      <td className={styles.ageCell}>{user.age}</td>
                      <td className={styles.collegeCell}>
                        {user.college_name}
                      </td>
                      <td className={styles.idCell}>{user.college_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noData}>
              <p>No participants registered yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventAnalytics;
