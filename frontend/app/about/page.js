import Link from "next/link";
import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.title}>About Campus Events</h1>
          <p className={styles.subtitle}>
            We help students and organisations discover, create, and manage campus events with ease.
          </p>
          <div className={styles.heroActions}>
            <Link href="/events" className={`${styles.btn} ${styles.primaryBtn}`}>
              Explore events
            </Link>
            <Link href="/create-organisation" className={`${styles.btn} ${styles.secondaryBtn}`}>
              Create organisation
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Built for campus communities</h2>
          <p className={styles.sectionLead}>
            Everything you need to run club activities, fests, workshops, and hackathons.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎓</div>
              <h3 className={styles.featureTitle}>Organisation-first</h3>
              <p className={styles.featureText}>
                Create your organisation, manage members, and publish official events with clear branding.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🗓️</div>
              <h3 className={styles.featureTitle}>Effortless event setup</h3>
              <p className={styles.featureText}>
                Draft details, upload banners, set capacity and ticketing, then go live in minutes.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✅</div>
              <h3 className={styles.featureTitle}>Smart registrations</h3>
              <p className={styles.featureText}>
                Built-in forms, attendee lists, and check-in tools help you run smooth events.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3 className={styles.featureTitle}>Safe and reliable</h3>
              <p className={styles.featureText}>
                Secure infrastructure and best practices to keep your data protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works (steps) */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepBadge}>1</span>
              <div>
                <h4 className={styles.stepTitle}>Create your organisation</h4>
                <p className={styles.stepText}>Complete a quick onboarding with KYC and branding.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepBadge}>2</span>
              <div>
                <h4 className={styles.stepTitle}>Publish your first event</h4>
                <p className={styles.stepText}>Set schedule, capacity, and details—then publish.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepBadge}>3</span>
              <div>
                <h4 className={styles.stepTitle}>Share and manage</h4>
                <p className={styles.stepText}>Track registrations and manage check-ins on the day.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
