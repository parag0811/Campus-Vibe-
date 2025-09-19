"use client";
import { useRouter } from "next/navigation";
import styles from "./error.module.css";

const ErrorPage = ({
  statusCode = 404,
  title,
  message,
  showRetry = false,
  onRetry,
}) => {
  const router = useRouter();

  const handleGoHome = () => router.push("/");
  const handleRetry = () => (onRetry ? onRetry() : window.location.reload());

  const resolvedTitle =
    title || (String(statusCode).startsWith("5") ? "Something went wrong" : "Oops!");
  const resolvedMsg =
    message ||
    (String(statusCode).startsWith("5")
      ? "We’re having trouble connecting you to Campus Vibe right now."
      : "We can’t seem to find the page you’re looking for.");

  return (
    <div className={styles.wrapper}>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.codeRow}>
            <span className={styles.digit}>4</span>
            <span className={styles.zero}>
              <span className={styles.face}>•‿•</span>
            </span>
            <span className={styles.digit}>
              {String(statusCode).startsWith("5") ? "0" : "4"}
            </span>
          </div>

          <h1 className={styles.title}>{resolvedTitle}</h1>
          <p className={styles.subtitle}>{resolvedMsg}</p>

          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.primary}`} onClick={handleGoHome}>
              Back to Homepage
            </button>
            {showRetry && (
              <button className={`${styles.btn} ${styles.ghost}`} onClick={handleRetry}>
                Try Again
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ErrorPage;
