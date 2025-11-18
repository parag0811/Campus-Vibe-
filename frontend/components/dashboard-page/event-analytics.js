"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./event-analytics.module.css";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventAnalytics = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const eventId = searchParams.get("event");
  const orgFromQS = searchParams.get("org");

  const [orgId, setOrgId] = useState(orgFromQS || null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve organisationId if not in query
  useEffect(() => {
    const ac = new AbortController();

    async function ensureOrgId() {
      if (orgFromQS) {
        setOrgId(orgFromQS);
        setLoading(false);
        return;
      }
      try {
        // Probe: owner or assigned admin
        const res = await fetch(`${API_BASE}/org-admin/organisation/is-member`, {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
          signal: ac.signal,
        });

        if (res.status === 401) {
          toast.info("Please login to view analytics.");
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (!res.ok || !data?.orgAdmin || !data?.organisationId) {
          toast.info("You need an organisation (owner or assigned admin).");
          router.push("/create-organisation");
          return;
        }
        setOrgId(String(data.organisationId));
      } catch (e) {
        if (!ac.signal.aborted) setError(e.message || "Failed to resolve organisation.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    ensureOrgId();
    return () => ac.abort();
  }, [orgFromQS, router, toast]);

  const fetchEventAnalytics = useCallback(async () => {
    if (!eventId || !orgId) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/org-admin/organisation/${encodeURIComponent(orgId)}/event/${encodeURIComponent(eventId)}/eventAnalytics`,
        { credentials: "include", signal: ac.signal, headers: { "Cache-Control": "no-cache" } }
      );

      if (res.status === 401) {
        toast.info("Session expired. Please login again.");
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        setError("You are not authorized to view this event’s analytics.");
        return;
      }
      if (res.status === 404) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Event not found or no analytics available.");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch analytics.");

      setAnalytics(data.analytics || null);
    } catch (e) {
      if (!ac.signal.aborted) {
        setError(e.message || "Failed to fetch analytics.");
        toast.error(e.message || "Failed to fetch analytics.");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }

    return () => ac.abort();
  }, [eventId, orgId, router, toast]);

  useEffect(() => {
    if (!eventId || !orgId) return;
    let canceled = false;
    (async () => {
      await fetchEventAnalytics();
    })();
    return () => {
      canceled = true;
    };
  }, [eventId, orgId, fetchEventAnalytics]);

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

  const registrations = analytics?.registerations || 0;
  const revenue = analytics?.revenue || {};
  const payout = analytics?.payout || {};
  const currency = revenue.currency || "INR";

  const gross = revenue.grossAmountPaise || 0;
  const platformFee = revenue.platformFeePaise || 0;
  const orgShare = revenue.orgSharePaise || 0;
  const pendingPayout = payout.pendingPayoutPaise ?? Math.max(0, orgShare - (payout.paidOutPaise || 0));

  const formatMoney = (p) => (p / 100).toLocaleString("en-IN", {
    style: "currency",
    currency
  });

  const users = Array.isArray(analytics?.registered_Users)
    ? analytics.registered_Users
    : [];

  // CSV exporter (Excel-friendly)
  const exportParticipantsCSV = () => {
    if (!users.length) return;

    const headers = ["Name", "Email", "Age", "College Name", "College ID"];
    const sanitize = (v) => {
      const s = (v ?? "").toString();
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = users.map((u) => [
      sanitize(u.name),
      sanitize(u.email),
      sanitize(u.age ?? ""),
      sanitize(u.college_name),
      sanitize(u.college_id),
    ]);

    const lines = [headers.map(sanitize).join(","), ...rows.map(r => r.join(","))];
    const csv = "\ufeff" + lines.join("\r\n"); // BOM for Excel

    const title = analytics?.title || eventId || "event";
    const fnameSafe = title.replace(/[^\w\-]+/g, "_").slice(0, 50);
    const fileName = `${fnameSafe}_participants_${new Date().toISOString().slice(0,10)}.csv`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: "Registrations", value: registrations, bg: "#E6FDF7" },
    { label: "Total Raised", value: formatMoney(gross), bg: "#FFECEC" },
    { label: "Platform Cut", value: formatMoney(platformFee), bg: "#F8F1ED" },
    { label: "Org Share", value: formatMoney(orgShare), bg: "#F2EEFE" },
    { label: "Pending Payout", value: formatMoney(pendingPayout), bg: "#E9F6FF" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Event Analytics</h1>
        <div className={styles.badgeRow}>
          {metrics.map(m => (
            <div key={m.label} className={styles.metricBadge} style={{ background:m.bg }}>
              <div className={styles.metricValue}>{m.value}</div>
              <div className={styles.metricLabel}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Registered Participants</h2>
            <div className={styles.actions}>
              <button
                onClick={exportParticipantsCSV}
                className={styles.exportButton}
                disabled={!users.length}
                title={users.length ? "Download CSV" : "No participants to export"}
              >
                Export CSV
              </button>
              <button
                onClick={fetchEventAnalytics}
                className={styles.refreshButton}
              >
                Refresh Data
              </button>
            </div>
          </div>

          {users.length > 0 ? (
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
                  {users.map((user, idx) => (
                    <tr key={`${user.email || idx}-${idx}`}>
                      <td className={styles.nameCell}>{user.name || "—"}</td>
                      <td className={styles.emailCell}>{user.email || "—"}</td>
                      <td className={styles.ageCell}>{user.age ?? "—"}</td>
                      <td className={styles.collegeCell}>
                        {user.college_name || "—"}
                      </td>
                      <td className={styles.idCell}>{user.college_id || "—"}</td>
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
