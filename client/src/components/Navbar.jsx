"use client";

import styles from "./Navbar.module.css";

export default function Navbar({ title = "Dashboard", admin, activeYear }) {
  const initials = (admin?.name || "A").slice(0, 1).toUpperCase();

  return (
    <header className={styles.navbar}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <div className={styles.right}>
        {activeYear && <span className={styles.year}>{activeYear}</span>}
        <div className={styles.profile}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.name}>{admin?.name || "Admin"}</span>
        </div>
      </div>
    </header>
  );
}
