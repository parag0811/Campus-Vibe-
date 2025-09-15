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
          </div>

          <div className={styles.newsletter}>
            <div className={styles.subscribeForm}>
              <input
                type="email"
                placeholder="Enter your mail"
                className={styles.emailInput}
              />
              <button className={styles.subscribeBtn}>Subscribe</button>
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
            <Link href="/services" className={styles.footerLink}>
              Services
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              Get in touch
            </Link>
          </nav>
        </div>

        <hr className={styles.divider} />

        <div className={styles.footerBottom}>
          <div className={styles.language}>
            <button className={styles.langBtn}>English</button>
            <button className={styles.langBtn}>French</button>
            <button className={styles.langBtn}>Hindi</button>
          </div>

          <div className={styles.copyright}>
            Non Copyrighted © 2025 Upload by CampusVibe
          </div>
        </div>
      </div>
    </footer>
  );
}
