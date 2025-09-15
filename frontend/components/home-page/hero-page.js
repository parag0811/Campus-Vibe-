import Image from "next/image";
import homebg from "@/assets/homebg.png";
import styles from "./hero-page.module.css";

export default function Hero() {
  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={homebg}
          alt="Event audience"
          className={styles.heroImage}
          priority
        />

        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>
            MADE FOR THOSE
            <br />
            WHO DO
          </h1>

          <div className={styles.navigationArrows}>
            <button className={styles.navArrow} aria-label="Previous slide">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className={styles.navArrow} aria-label="Next slide">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <div className={styles.searchGroup}>
            <label className={styles.searchLabel}>Looking for</label>
            <div className={styles.selectWrapper}>
              <select className={styles.searchSelect} defaultValue="">
                <option value="" disabled>
                  Choose event type
                </option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="concert">Concert</option>
                <option value="exhibition">Exhibition</option>
              </select>
              <div className={styles.selectArrow}></div>
            </div>
          </div>

          <div className={styles.searchGroup}>
            <label className={styles.searchLabel}>Location</label>
            <div className={styles.selectWrapper}>
              <select className={styles.searchSelect} defaultValue="">
                <option value="" disabled>
                  Choose location
                </option>
                <option value="new-york">New York</option>
                <option value="los-angeles">Los Angeles</option>
                <option value="chicago">Chicago</option>
                <option value="miami">Miami</option>
              </select>
              <div className={styles.selectArrow}></div>
            </div>
          </div>

          <div className={styles.searchGroup}>
            <label className={styles.searchLabel}>When</label>
            <div className={styles.selectWrapper}>
              <select className={styles.searchSelect} defaultValue="">
                <option value="" disabled>
                  Choose date and time
                </option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
              </select>
              <div className={styles.selectArrow}></div>
            </div>
          </div>

          <button className={styles.searchButton} aria-label="Search">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 21L16.65 16.65"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
