"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "./owner.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function OwnerDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [minPending, setMinPending] = useState("");
  const [error, setError] = useState(null);
  const [settling, setSettling] = useState(null);

  const fetchData = useCallback(async () => {
    if (!API_BASE) {
      setError("API not configured.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (minPending && !isNaN(minPending)) params.append("minPendingPaise", minPending);
      const res = await fetch(`${API_BASE}/owner/settlements?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load settlements");
      setRows(Array.isArray(data.settlements) ? data.settlements : []);
    } catch (e) {
      setError(e.message || "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, minPending]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatMoney = (p) =>
    (Number(p || 0) / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  const settleOrg = async (orgId) => {
    if (!API_BASE || settling) return;
    setSettling(orgId);
    try {
      const res = await fetch(`${API_BASE}/owner/settlements/${orgId}/settle`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Settlement failed");
      await fetchData();
    } catch (e) {
      setError(e.message || "Settlement error");
    } finally {
      setSettling(null);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        <h1 className={styles.title}>Owner Settlements</h1>
        <div className={styles.filters}>
          <input
            placeholder="Search organisation..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={styles.input}
          />
          <input
            placeholder="Min pending (paise)"
            value={minPending}
            onChange={(e) => setMinPending(e.target.value.replace(/\D/g, ""))}
            className={styles.input}
          />
          <button
            className={styles.refreshBtn}
            onClick={() => {
              setQ("");
              setMinPending("");
            }}
            disabled={!q && !minPending}
          >
            Reset
          </button>
          <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
            Refresh
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No organisations found.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Org</th>
                  <th>Gross</th>
                  <th>Platform Fee</th>
                  <th>Org Share</th>
                  <th>Paid Out</th>
                  <th>Pending</th>
                  <th>Last Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.organisationId}>
                    <td className={styles.orgCell}>
                      <div className={styles.logoBox}>
                        {r.logoUrl ? (
                          <img
                            src={r.logoUrl}
                            alt={r.organisationName}
                            className={styles.logo}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.logoPlaceholder}>ORG</div>
                        )}
                      </div>
                      <div>
                        <div className={styles.orgName}>{r.organisationName}</div>
                        <div className={styles.orgEmail}>{r.organisationEmail || "—"}</div>
                      </div>
                    </td>
                    <td>{formatMoney(r.totals.grossAmountPaise)}</td>
                    <td>{formatMoney(r.totals.platformFeePaise)}</td>
                    <td>{formatMoney(r.totals.orgSharePaise)}</td>
                    <td>{formatMoney(r.totals.paidOutPaise)}</td>
                    <td className={styles.pending}>{formatMoney(r.totals.pendingPayoutPaise)}</td>
                    <td>
                      {r.latestPaymentAt
                        ? new Date(r.latestPaymentAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        className={styles.settleBtn}
                        disabled={
                          settling === r.organisationId ||
                          r.totals.pendingPayoutPaise <= 0
                        }
                        onClick={() => settleOrg(r.organisationId)}
                      >
                        {settling === r.organisationId
                          ? "Settling..."
                          : r.totals.pendingPayoutPaise > 0
                          ? "Settle"
                          : "Clear"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}