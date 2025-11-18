import Image from "next/image";
import Link from "next/link";
import homebg from "@/assets/homebg.png";
import styles from "./hero-page.module.css";

export default function Hero() {
  return (
    <section className={styles.heroContainer}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={homebg}
          alt="Event audience"
          className={styles.heroImage}
          priority
        />

        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>
            Command Your
            <br />
            Campus Experience
          </h1>
          <p className={styles.heroSubheading}>
            Operate events, roles, and engagement without friction
          </p>
          <div className={styles.heroActions}>
            <Link href="/events" className={styles.primaryBtn}>
              <span>Explore now</span>
              <svg
                className={styles.btnIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <Link href="/about" className={styles.secondaryBtn}>
              Know about us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
