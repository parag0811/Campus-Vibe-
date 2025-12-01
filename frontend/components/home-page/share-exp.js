import { useState } from "react";
import styles from "./OrgItem.module.css";

const OrgItem = ({ name, logoUrl }) => {
  const initial = (name || "C").charAt(0).toUpperCase();
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={styles.orgItem}>
      <div className={styles.avatar}>
        {!loaded && <div className={styles.avatarSkeleton} />}
        {!broken && logoUrl ? (
          <img
            src={logoUrl}
            alt={name || "Organisation"}
            className={`${styles.avatarImg} ${loaded ? styles.visible : styles.hidden}`}
            width={88}
            height={88}
            onLoad={() => setLoaded(true)}
            onError={() => { setBroken(true); setLoaded(true); }}
            loading="lazy"
          />
        ) : (
          <div className={styles.avatarFallback}>{initial}</div>
        )}
      </div>
      <div className={styles.orgLabel}>{name || "Organisation"}</div>
    </div>
  );
};

export default OrgItem;