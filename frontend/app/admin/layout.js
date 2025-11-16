import Sidebar from "@/components/dashboard-page/sidebar";
import styles from "./admin.module.css";
export default function AdminLayout({ children }) {

  return (
    <div className={styles.adminContainer}>
      <header className={styles.header}>
        <div className={styles.logo}>Campus Vibe</div>
      </header>

      <div className={styles.contentWrapper}>
        <Sidebar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
