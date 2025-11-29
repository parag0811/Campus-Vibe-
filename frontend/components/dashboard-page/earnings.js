"use client";
import styles from "./earnings.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const Earnings = () => {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();

    const load = async () => {
      if (!API_BASE) {
        setError("API base URL not configured.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");

        // Backend enforces owner-only; just ensure logged-in
        const res = await fetch(`${API_BASE}/org/organisationAdmin/earnings`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
          headers: { "Cache-Control": "no-cache", Accept: "application/json" },
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          setError("Only the organisation owner can view earnings.");
          setData(null);
          return;
        }
        if (!res.ok) {
          setError("Failed to load earnings.");
          setData(null);
          return;
        }

        const json = await res.json().catch(() => null);
        if (!json) {
          setError("Invalid response.");
          setData(null);
          return;
        }

        setData({
          organisationName: json.organisationName || "",
          totals: json.totals || {
            events: 0,
            ticketsSold: 0,
            grossAmountPaise: 0,
            platformFeePaise: 0,
            orgSharePaise: 0,
          },
          eventsBreakdown: Array.isArray(json.eventsBreakdown)
            ? json.eventsBreakdown
            : [],
        });
      } catch (err) {
        if (ac.signal.aborted) return;
        setError("Network error. Please retry.");
        setData(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => ac.abort();
  }, [router]);

  const formatMoney = (p) =>
    (Number(p || 0) / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  const refresh = () => {
    // Force re-run by updating state via a simple re-mount pattern if needed,
    // here we just re-call load by navigating to same route:
    // Prefer a manual fetch re-run:
    setLoading(true);
    setError("");
    setData(null);
    // Trigger a soft reload of the component by pushing the same route
    router.refresh?.(); // Next 14+; if not available, call window.location.reload()
  };

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading} role="status" aria-live="polite">
          Loading earnings...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.screen}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error || "Failed to load earnings."}</p>
          <button className={styles.refreshBtn} onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totals, eventsBreakdown } = data;

  return (
    <div className={styles.screen}>
      <div className={styles.badgeRow}>
        <div className={styles.metricBadge} style={{ background: "#E6FDF7" }}>
          <div className={styles.metricValue}>{totals.events}</div>
          <div className={styles.metricLabel}>Events</div>
        </div>
        <div className={styles.metricBadge} style={{ background: "#E9F6FF" }}>
          <div className={styles.metricValue}>{totals.ticketsSold}</div>
          <div className={styles.metricLabel}>Tickets Sold</div>
        </div>
        <div className={styles.metricBadge} style={{ background: "#FFECEC" }}>
          <div className={styles.metricValue}>{formatMoney(totals.grossAmountPaise)}</div>
          <div className={styles.metricLabel}>Total Raised</div>
        </div>
        <div className={styles.metricBadge} style={{ background: "#F8F1ED" }}>
          <div className={styles.metricValue}>{formatMoney(totals.platformFeePaise)}</div>
          <div className={styles.metricLabel}>Platform Cut</div>
        </div>
        <div className={styles.metricBadge} style={{ background: "#F2EEFE" }}>
          <div className={styles.metricValue}>{formatMoney(totals.orgSharePaise)}</div>
          <div className={styles.metricLabel}>Total Earnings</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Event Breakdown</h2>
          <div className={styles.actions}>
            <button className={styles.refreshBtn} onClick={refresh}>
              Refresh
            </button>
          </div>
        </div>

        {eventsBreakdown.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Tickets Sold</th>
                  <th>Total Raised</th>
                  <th>Platform Cut</th>
                  <th>Total Earnings</th>
                  <th>Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {eventsBreakdown.map((r) => (
                  <tr key={r.eventId}>
                    <td>{r.title || "—"}</td>
                    <td>{r.ticketsSold || 0}</td>
                    <td>{formatMoney(r.grossAmountPaise)}</td>
                    <td>{formatMoney(r.platformFeePaise)}</td>
                    <td>{formatMoney(r.orgSharePaise)}</td>
                    <td>
                      {r.lastPaymentAt
                        ? new Date(r.lastPaymentAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noRows}>No earnings yet.</div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
