"use client";
import { useState } from "react";
import styles from "./share-exp.module.css";
import Link from "next/link";
import Image from "next/image";

const ExperienceCard = ({ image, profile, name, comment, date }) => {
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.profileSection}>
            <div className={styles.profileImage}>
              {profile ? (
                <Image src={profile} alt={name} className={styles.profilePic} />
              ) : (
                <div className={styles.profileInitial}>{name.charAt(0)}</div>
              )}
            </div>
            <h4 className={styles.userName}>{name}</h4>
          </div>
          <p className={styles.comment}>{comment}</p>
          <p className={styles.date}>{date}</p>
        </div>
      </div>
    </div>
  );
};

export default function ShareExperiences() {
  const [experiences, setExperiences] = useState([
    {
      id: 1,
      image: "/api/placeholder/400/240",
      profile: null,
      name: "John Smith",
      comment:
        "BestSeller Book Bootcamp was amazing! I learned so much about writing and publishing. Would definitely recommend it to anyone interested in becoming an author.",
      date: "Saturday, March 18, 3:30PM",
    },
    {
      id: 2,
      image: "/api/placeholder/400/240",
      profile: null,
      name: "Sarah Johnson",
      comment:
        "The workshop provided excellent insights into marketing books. The speaker was knowledgeable and engaging. Can't wait to apply these strategies to my own work.",
      date: "Saturday, March 18, 3:30PM",
    },
    {
      id: 3,
      image: "/api/placeholder/400/240",
      profile: null,
      name: "Michael Chen",
      comment:
        "As a first-time author, this bootcamp gave me the confidence and tools I needed to navigate the publishing world. The networking opportunities were invaluable.",
      date: "Saturday, March 18, 3:30PM",
    },
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Share your <span className={styles.purple}>experiences</span>
        </h2>
        <Link href="/share-experience" className={styles.shareButton}>
          Share your experience
        </Link>
      </div>

      <div className={styles.experiencesGrid}>
        {experiences.map((exp) => (
          <ExperienceCard
            key={exp.id}
            image={exp.image}
            profile={exp.profile}
            name={exp.name}
            comment={exp.comment}
            date={exp.date}
          />
        ))}
      </div>
    </div>
  );
}
