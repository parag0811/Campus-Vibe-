"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./earnings.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Earnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/org/organisationAdmin/earnings`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed");
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const currency = "INR";
  const totals = data?.totals || {
    events: 0,
    ticketsSold: 0,
    grossAmountPaise: 0,
    platformFeePaise: 0,
    orgSharePaise: 0,
  };

  const formatMoney = (p) =>
    (Number(p || 0) / 100).toLocaleString("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });

  const metrics = useMemo(
    () => [
      { label: "Events", value: totals.events, bg: "#E6FDF7" },
      { label: "Tickets Sold", value: totals.ticketsSold, bg: "#E9F6FF" },
      { label: "Total Raised", value: formatMoney(totals.grossAmountPaise), bg: "#FFECEC" },
      { label: "Platform Cut", value: formatMoney(totals.platformFeePaise), bg: "#F8F1ED" },
      { label: "Total Earnings", value: formatMoney(totals.orgSharePaise), bg: "#F2EEFE" },
    ],
    [totals]
  );

  const rows = Array.isArray(data?.eventsBreakdown) ? data.eventsBreakdown : [];

  const exportCSV = () => {
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
          esc(r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleString() : "—"),
        ].join(",")
      ),
    ];
    const csv = "\ufeff" + lines.join("\r\n");
    const fname = `${(data?.organisationName || "organisation")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 50)}_earnings_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className={styles.screen}><div className={styles.loading}>Loading...</div></div>;
  }

  if (!data) {
    return (
      <div className={styles.screen}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>Failed to load earnings.</p>
          <button className={styles.refreshBtn} onClick={fetchEarnings}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
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