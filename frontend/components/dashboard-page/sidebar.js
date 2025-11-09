"use client";
import styles from "./sidebar.module.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import OrganisationIcon from "@/assets/logo/profile.svg";
import eventsIcon from "@/assets/logo/events.svg";
import adminsIcon from "@/assets/logo/admins.svg";
import earningsIcon from "@/assets/logo/earnings.svg";

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        <ul className={styles.navList}>
          <li className={`${styles.navItem} ${isActive("/admin/organisation") ? styles.active : ""}`}>
            <Link href="/admin/organisation" className={styles.navLink}>
              <div className={styles.navIcon}>
                <Image src={OrganisationIcon} alt="Organisation" width={22} height={22} />
              </div>
              <span className={styles.navText}>Organisation</span>
            </Link>
          </li>

            <li className={`${styles.navItem} ${isActive("/admin/events") ? styles.active : ""}`}>
              <Link href="/admin/events" className={styles.navLink}>
                <div className={styles.navIcon}>
                  <Image src={eventsIcon} alt="Events" width={20} height={20} />
                </div>
                <span className={styles.navText}>Events</span>
              </Link>
            </li>

          <li className={`${styles.navItem} ${isActive("/admin/admins") ? styles.active : ""}`}>
            <Link href="/admin/admins" className={styles.navLink}>
              <div className={styles.navIcon}>
                <Image src={adminsIcon} alt="Admins" width={20} height={20} />
              </div>
              <span className={styles.navText}>Admins</span>
            </Link>
          </li>

          <li className={`${styles.navItem} ${isActive("/admin/earnings") ? styles.active : ""}`}>
            <Link href="/admin/earnings" className={styles.navLink}>
              <div className={styles.navIcon}>
                <Image src={earningsIcon} alt="Earnings" width={20} height={20} />
              </div>
              <span className={styles.navText}>Earnings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
