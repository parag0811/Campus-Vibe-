"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./event-analytics.module.css";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== "undefined" && !API_BASE) {
  console.warn("NEXT_PUBLIC_API_URL is not defined. Analytics will fail.");
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function decodeRoleFromJWT() {
  try {
    const token = getCookie("token");
    if (!token) return null;
    const payloadSeg = token.split(".")[1];
    if (!payloadSeg) return null;
    const base = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base + "=".repeat((4 - (base.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return json.role || null;
  } catch {
    return null;
  }
}

export default function EventAnalytics() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const eventId = searchParams.get("event");
  const orgFromQS = searchParams.get("org");

  const [orgId, setOrgId] = useState(orgFromQS || null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orgMember, setOrgMember] = useState(false);
  const [role, setRole] = useState(null);

  const membershipAbortRef = useRef(null);
  const analyticsAbortRef = useRef(null);
  const mountedRef = useRef(true);

  const safeSet = (fn) => {
    if (mountedRef.current) fn();
  };

  // Resolve organisation membership
  useEffect(() => {
    mountedRef.current = true;
    setRole(decodeRoleFromJWT());

    if (!API_BASE) {
      safeSet(() => {
        setError("API base not configured.");
        setLoading(false);
      });
      return;
    }

    if (membershipAbortRef.current) membershipAbortRef.current.abort();
    const ac = new AbortController();
    membershipAbortRef.current = ac;

    (async () => {
      try {
        safeSet(() => {
          setLoading(true);
          setError(null);
        });

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
          toast.info("You must belong to an organisation.");
          router.push("/create-organisation");
          return;
        }

        safeSet(() => {
          setIsOwner(!!data.isOwner);
          setOrgMember(!!data.orgAdmin);
          setOrgId(orgFromQS || String(data.organisationId));
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          safeSet(() => setError(e.message || "Failed to resolve organisation."));
        }
      } finally {
        if (!ac.signal.aborted) safeSet(() => setLoading(false));
      }
    })();

    return () => {
      mountedRef.current = false;
      ac.abort();
    };
  }, [orgFromQS, router, toast]);

  const fetchEventAnalytics = useCallback(async () => {
    if (!API_BASE) {
      safeSet(() => setError("API base not configured."));
      return;
    }
    if (!eventId || !orgId) return;

    if (analyticsAbortRef.current) analyticsAbortRef.current.abort();
    const ac = new AbortController();
    analyticsAbortRef.current = ac;

    safeSet(() => {
      setLoading(true);
      setError(null);
    });

    try {
      const res = await fetch(
        `${API_BASE}/org-admin/organisation/${encodeURIComponent(
          orgId
        )}/event/${encodeURIComponent(eventId)}/eventAnalytics`,
        {
          credentials: "include",
          signal: ac.signal,
          headers: { "Cache-Control": "no-cache" },
        }
      );

      if (res.status === 401) {
        toast.info("Session expired. Please login.");
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        safeSet(() => setError("Not authorized to view this event’s analytics."));
        return;
      }
      if (res.status === 404) {
        const data = await res.json().catch(() => ({}));
        safeSet(() => setError(data?.message || "Event not found."));
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch analytics.");

      safeSet(() => setAnalytics(data.analytics || null));
    } catch (e) {
      if (e.name !== "AbortError") {
        safeSet(() => setError(e.message || "Failed to fetch analytics."));
        toast.error(e.message || "Failed to fetch analytics.");
      }
    } finally {
      if (!ac.signal.aborted) safeSet(() => setLoading(false));
    }
  }, [API_BASE, eventId, orgId, router, toast]);

  // Trigger analytics fetch after membership resolves
  useEffect(() => {
    if (eventId && orgId) fetchEventAnalytics();
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
  const pendingPayout =
    payout.pendingPayoutPaise ??
    Math.max(0, orgShare - (payout.paidOutPaise || 0));

  const formatMoney = (p) =>
    (Number(p || 0) / 100).toLocaleString("en-IN", {
      style: "currency",
      currency,
    });

  const users = Array.isArray(analytics?.registered_Users)
    ? analytics.registered_Users
    : [];

  const exportParticipantsCSV = () => {
    if (!users.length) return;
    const headers = ["Name", "Email", "Age", "College Name", "College ID"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(","),
      ...users.map((u) =>
        [
          esc(u.name),
          esc(u.email),
          esc(u.age ?? ""),
          esc(u.college_name),
          esc(u.college_id),
        ].join(",")
      ),
    ];
    const csv = "\ufeff" + lines.join("\r\n");
    const title = analytics?.title || eventId || "event";
    const fname = `${title.replace(/[^\w\-]+/g, "_").slice(0, 50)}_participants_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const limitedAccess = orgMember && !isOwner && role !== "organisationAdmin";
  const metrics = limitedAccess
    ? [{ label: "Registrations", value: registrations, bg: "#E6FDF7" }]
    : [
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
          {metrics.map((m) => (
            <div
              key={m.label}
              className={styles.metricBadge}
              style={{ background: m.bg }}
            >
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
                title={users.length ? "Download CSV" : "No participants"}
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

          {users.length ? (
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
                  {users.map((u, i) => (
                    <tr key={`${u.email || i}-${i}`}>
                      <td className={styles.nameCell}>{u.name || "—"}</td>
                      <td className={styles.emailCell}>{u.email || "—"}</td>
                      <td>{u.age ?? "—"}</td>
                      <td className={styles.collegeCell}>
                        {u.college_name || "—"}
                      </td>
                      <td className={styles.idCell}>{u.college_id || "—"}</td>
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
}
