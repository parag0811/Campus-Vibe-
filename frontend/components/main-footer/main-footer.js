"use client";
import styles from "./main-footer.module.css";
import Link from "next/link";

export default function MainFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerTop}>
          <div className={styles.branding}>
            <h2 className={styles.brandName}>
              Campus <span className={styles.purple}>Vibe</span>
            </h2>
            <p className={styles.brandTagline}>
              Discover. Host. Experience.
            </p>
          </div>

          <div className={styles.newsletter}>
            <div className={styles.subscribeForm}>
              <div className={styles.subscribeHeading}>
                <span className={styles.headingLeft}>Campus</span>
                <span className={styles.headingRight}>Events</span>
              </div>
              <p className={styles.subscribeNote}>
                Curated happenings from top clubs & campuses.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.footerMiddle}>
          <nav className={styles.footerNav}>
            <Link href="/" className={styles.footerLink}>
              Home
            </Link>
            <Link href="/about" className={styles.footerLink}>
              About
            </Link>
            <Link href="/service" className={styles.footerLink}>
              Services
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              Get in touch
            </Link>
          </nav>

          <div className={styles.infoColumns}>
            <div className={styles.infoCol}>
              <div className={styles.infoTitle}>Explore</div>
              <Link
                href="/events"
                className={styles.infoLink}
              >
                Upcoming Events
              </Link>
              <Link
                href="/my-events"
                className={styles.infoLink}
              >
                My Tickets
              </Link>
              <Link
                href="/create-organisation"
                className={styles.infoLink}
              >
                Create Organisation
              </Link>
            </div>

            <div className={styles.infoCol}>
              <div className={styles.infoTitle}>Resources</div>
              <Link
                href="/verify-email"
                className={styles.infoLink}
              >
                Verify Email
              </Link>
              <Link
                href="/forgot-password"
                className={styles.infoLink}
              >
                Forgot Password
              </Link>
              <Link
                href="/contact"
                className={styles.infoLink}
              >
                Support
              </Link>
            </div>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.footerBottom}>
          <div className={styles.language}>
            <button className={styles.langBtn}>English</button>
          </div>

          <div className={styles.copyright}>
            Non Copyrighted © 2025 Upload by CampusVibe
          </div>
        </div>
      </div>
    </footer>
  );
}
