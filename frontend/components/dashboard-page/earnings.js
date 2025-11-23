"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import styles from "./earnings.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/common/authContext"; 

const API_BASE = process.env.NEXT_PUBLIC_API_URL ; 
const REQUEST_TIMEOUT = 10000; 

function fetchWithTimeout(url, options = {}, ms = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(t));
}

export default function Earnings() {
  const router = useRouter();
  const { authChecked, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const mountedRef = useRef(true);
  const slowTimerRef = useRef(null);

  const safeSet = (fn) => mountedRef.current && fn();

  const handleAuth = useCallback(() => {
    router.replace("/login");
  }, [router]);

  const fetchEarnings = useCallback(async () => {
    if (!API_BASE) {
      safeSet(() => {
        setError("API base URL not configured.");
        setLoading(false);
        setData(null);
      });
      return;
    }
    safeSet(() => {
      setLoading(true);
      setError(null);
      setSlow(false);
    });
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => safeSet(() => setSlow(true)), 4000);

    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/org/organisationAdmin/earnings`,
        {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" }
        }
      );

      if (res.status === 401) {
        handleAuth();
        return;
      }
      if (res.status === 403) {
        safeSet(() => {
          setError("Only the organisation owner can view earnings.");
          setData(null);
        });
        return;
      }
      if (res.status === 429) {
        safeSet(() => setError("Rate limited. Try again shortly."));
        return;
      }
      if (res.status >= 500) {
        safeSet(() => setError("Server error. Please retry."));
        return;
      }

      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error("Invalid response.");
      }

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load earnings.");
      }

      safeSet(() => {
        setData(json);
        setLastLoadedAt(Date.now());
      });
    } catch (e) {
      if (e.name === "AbortError") {
        safeSet(() => setError("Request timed out. Retry."));
      } else {
        safeSet(() => setError(e.message || "Network error."));
      }
      safeSet(() => setData(null));
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      safeSet(() => setLoading(false));
    }
  }, [handleAuth]);

  useEffect(() => {
    if (!authChecked) return;              // wait until auth status known
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    fetchEarnings();                       // only fetch after auth ready
    return () => {
      mountedRef.current = false;
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [authChecked, isAuthenticated, fetchEarnings, router]); // UPDATED deps

  const currency = "INR";
  const totals = data?.totals || {
    events: 0,
    ticketsSold: 0,
    grossAmountPaise: 0,
    platformFeePaise: 0,
    orgSharePaise: 0
  };

  const formatMoney = useCallback(
    (p) =>
      (Number(p || 0) / 100).toLocaleString("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
      }),
    [currency]
  );

  const metrics = useMemo(
    () => [
      { label: "Events", value: totals.events, bg: "#E6FDF7" },
      { label: "Tickets Sold", value: totals.ticketsSold, bg: "#E9F6FF" },
      { label: "Total Raised", value: formatMoney(totals.grossAmountPaise), bg: "#FFECEC" },
      { label: "Platform Cut", value: formatMoney(totals.platformFeePaise), bg: "#F8F1ED" },
      { label: "Total Earnings", value: formatMoney(totals.orgSharePaise), bg: "#F2EEFE" }
    ],
    [totals, formatMoney]
  );

  const rows = Array.isArray(data?.eventsBreakdown) ? data.eventsBreakdown : [];

  const exportCSV = useCallback(() => {
    if (!rows.length) return;
    const headers = ["Event", "Tickets Sold", "Gross", "Platform Fee", "Org Share", "Last Payment"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(","),
      ...rows.map((r) =>
        [
          esc(r.title),
          esc(r.ticketsSold),
          esc(formatMoney(r.grossAmountPaise)),
          esc(formatMoney(r.platformFeePaise)),
          esc(formatMoney(r.orgSharePaise)),
          esc(r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleString() : "—")
        ].join(",")
      )
    ];
    const csv = "\ufeff" + lines.join("\r\n");
    const fname = `${(data?.organisationName || "organisation")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 50)}_earnings_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows, formatMoney, data?.organisationName]);

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading} role="status" aria-live="polite">
          Loading earnings...
        </div>
        {slow && (
          <div className={styles.slowHint}>
            Taking longer than usual. You can Retry or check network.
            <button className={styles.refreshBtn} onClick={fetchEarnings}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className={styles.screen}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error || "Failed to load earnings."}</p>
          <button className={styles.refreshBtn} onClick={fetchEarnings}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {lastLoadedAt && (
        <div className={styles.loadedMeta}>
          Last updated: {new Date(lastLoadedAt).toLocaleTimeString()}
        </div>
      )}
      <div className={styles.badgeRow}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metricBadge} style={{ background: m.bg }}>
            <div className={styles.metricValue}>{m.value}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Event Breakdown</h2>
          <div className={styles.actions}>
            <button className={styles.exportBtn} onClick={exportCSV} disabled={!rows.length}>
              Export CSV
            </button>
            <button className={styles.refreshBtn} onClick={fetchEarnings}>
              Refresh
            </button>
          </div>
        </div>

        {rows.length ? (
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
                {rows.map((r) => (
                  <tr key={r.eventId}>
                    <td>{r.title || "—"}</td>
                    <td>{r.ticketsSold || 0}</td>
                    <td>{formatMoney(r.grossAmountPaise)}</td>
                    <td>{formatMoney(r.platformFeePaise)}</td>
                    <td>{formatMoney(r.orgSharePaise)}</td>
                    <td>{r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleString() : "—"}</td>
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
}