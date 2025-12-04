"use client";
import { useState, useEffect, useCallback } from "react";
import styles from "./all-events.module.css";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== "undefined" && !API_BASE) {
  console.warn("NEXT_PUBLIC_API_URL missing. Events search will fail.");
}

const EventCard = ({ id, image, title, date, time, orgName, promoted }) => {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleClick = () => router.push(`/events/${id}`);

  const src = broken ? "/default-event.jpg" : image;

  return (
    <div className={styles.cardWrapper} onClick={handleClick}>
      <div className={styles.posterCard}>
        <div className={styles.posterBox}>
          {!loaded && <div className={styles.posterSkeleton} />}
          <img
            src={src}
            alt={title}
            className={`${styles.posterImg} ${loaded ? styles.visible : styles.hidden}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setBroken(true);
              setLoaded(true);
            }}
          />
          {promoted && <span className={styles.promotedBadge}>PROMOTED</span>}
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.eventTitle}>{title}</h3>
          <p className={styles.eventDate}>
            {date}, {time}
          </p>
          <p className={styles.eventType}>{orgName || "Organisation"}</p>
        </div>
      </div>
    </div>
  );
};

export default function AllEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [noEventsMessage, setNoEventsMessage] = useState("");
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all"); 
  const [free, setFree] = useState("all"); 
  const [upcoming, setUpcoming] = useState("all"); 
  const [sort, setSort] = useState("newest"); 

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = useCallback(
    (nextPage = 1) => {
      const params = new URLSearchParams();
      params.append("page", String(nextPage));
      params.append("limit", String(limit));
      params.append("sort", sort);
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (mode !== "all") params.append("mode", mode);
      if (free === "free") params.append("free", "true");
      else if (free === "paid") params.append("free", "false");
      if (upcoming === "upcoming") params.append("upcoming", "true");
      else if (upcoming === "past") params.append("upcoming", "false");
      return params.toString();
    },
    [limit, sort, debouncedSearch, mode, free, upcoming]
  );

  const mapEvents = (list) => {
    const fmt = (d, opts) => {
      try {
        return new Date(d).toLocaleString(undefined, opts);
      } catch {
        return "";
      }
    };

    const looksLikeId = (v) =>
      typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

    return list.map((ev) => {
      const start = ev.start_date || ev.createdAt || Date.now();
      const nameA = ev?.organisation?.name;
      const nameB = ev?.created_by_organisation?.name;
      const nameC = !nameA && !nameB && typeof ev?.created_by_organisation === "string"
        ? (looksLikeId(ev.created_by_organisation) ? "" : ev.created_by_organisation)
        : "";

      const orgName = nameA || nameB || nameC || "Organisation";

      return {
        id: ev._id,
        image: ev.imageUrl || "/default-event.jpg",
        title: ev.title || "Untitled event",
        date: fmt(start, { weekday: "long", month: "long", day: "numeric" }),
        time: fmt(start, { hour: "numeric", minute: "2-digit" }),
        orgName,
        promoted: !!ev.promoted,
      };
    });
  };

  const fetchEvents = useCallback(
    async (reset = false) => {
      if (!API_BASE) {
        setError("API not configured.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        if (reset) {
          setPage(1);
          setEvents([]);
        }
        const q = buildQuery(reset ? 1 : page);
        const res = await fetch(`${API_BASE}/search?${q}`, {
          headers: { "Cache-Control": "no-cache" }
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) {
            setEvents([]);
            setNoEventsMessage(data.message || "No events found.");
            setTotal(0);
            return;
          }
          throw new Error(data.message || "Failed to load events.");
        }
        const list = Array.isArray(data?.data?.events)
          ? data.data.events
          : Array.isArray(data?.events)
          ? data.events
          : [];
        const mapped = mapEvents(list);
        setTotal(data?.data?.total || data?.total || mapped.length);
        setNoEventsMessage(mapped.length === 0 ? "No events found." : "");
        setEvents((prev) => (reset ? mapped : [...prev, ...mapped]));
      } catch (e) {
        setError(e.message || "Network error.");
        if (reset) setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, buildQuery, page]
  );

  useEffect(() => {
    setPage(1);
    fetchEvents(true);
  }, [debouncedSearch, mode, free, upcoming, sort, fetchEvents]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
  };

  useEffect(() => {
    if (page > 1) fetchEvents(false);
  }, [page, fetchEvents]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Events <span className={styles.purple}>around you</span>
        </h2>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={styles.select}
          aria-label="Mode"
        >
          <option value="all">All Modes</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <select
          value={free}
          onChange={(e) => setFree(e.target.value)}
          className={styles.select}
          aria-label="Price"
        >
          <option value="all">All Prices</option>
          <option value="free">Free</option>
            <option value="paid">Paid</option>
        </select>
        <select
          value={upcoming}
          onChange={(e) => setUpcoming(e.target.value)}
          className={styles.select}
          aria-label="Time"
        >
          <option value="all">All Dates</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={styles.select}
          aria-label="Sort"
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
        </select>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => {
            setSearch("");
            setMode("all");
            setFree("all");
            setUpcoming("all");
            setSort("newest");
          }}
          disabled={
            !search &&
            mode === "all" &&
            free === "all" &&
            upcoming === "all" &&
            sort === "newest"
          }
        >
          Reset
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
          <button
            className={styles.retryInline}
            onClick={() => fetchEvents(true)}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.eventsGrid}>
        {noEventsMessage && !loading && (
          <div className={styles.noEventsMessage}>{noEventsMessage}</div>
        )}
        {events.length === 0 && !noEventsMessage && loading && (
          <div className={styles.noEventsMessage}>Loading events...</div>
        )}
        {events.map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>

      <div className={styles.paginationContainer}>
        {loading && events.length > 0 && (
          <div className={styles.loadingMore}>Loading...</div>
        )}
        {!loading && events.length < total && events.length > 0 && (
          <button className={styles.loadMoreButton} onClick={loadMore}>
            Load More
          </button>
        )}
      </div>
    </div>
  );
}
