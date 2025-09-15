import styles from "./events.module.css";
import Image from "next/image";
import eventbg from "@/assets/eventbg.png";
import AllEvents from "@/components/events-page/all-events";

export default async function EventsPage() {
  return (
    <>
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <p className={styles.tagline}>Thriving Above Event Expectations.</p>
          <h1 className={styles.title}>
            Campus<span className={styles.highlight}>Vibe</span>-ing <br /> the
            Best.Day. <br />
            Ever.
          </h1>

          <div className={styles.statsContainer}>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>2k+</div>
              <div className={styles.statLabel}>Total Events Hosted</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statNumber}>100+</div>
              <div className={styles.statLabel}>Total Events Live</div>
            </div>
          </div>
        </div>

        <div className={styles.imageWrapper}>
          <div className={styles.imageContainer}>
            <Image
              src={eventbg}
              alt="Concert with lights"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </section>
      <AllEvents />
    </>
  );
}
