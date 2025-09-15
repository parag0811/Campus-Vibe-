"use client";
import styles from "./event-creation.module.css";
import Link from "next/link";
import Image from "next/image";
import eventcreationbg from "@/assets/eventcreationbg.png";

export default function EventCreation() {
  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerContent}>
        <div className={styles.imageSection}>
          <Image src={eventcreationbg} alt="Create" />
        </div>
        <div className={styles.textSection}>
          <h2 className={styles.bannerTitle}>Make your own Event</h2>
          <p className={styles.bannerDesc}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          <Link href="/create-event" className={styles.createEventBtn}>
            Create Events
          </Link>
        </div>
      </div>
    </div>
  );
}
