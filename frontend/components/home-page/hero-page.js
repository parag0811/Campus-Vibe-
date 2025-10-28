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
        />
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>
            MADE FOR THOSE
            <br />
            WHO DO
          </h1>
        </div>
      </div>
    </div>
  );
}
