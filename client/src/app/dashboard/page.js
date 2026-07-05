"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import styles from "./page.module.css";

const CARDS = [
  { key: "departments", label: "Departments" },
  { key: "staff", label: "Staff" },
  { key: "subjects", label: "Subjects" },
  { key: "halls", label: "Halls" },
];

export default function DashboardPage() {
  useEffect(() => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
      }
    },[])
  const [stats, setStats] = useState({});

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats({}));
  }, []);

  return (
    <div className={styles.grid}>
      {CARDS.map(({ key, label }) => (
        <div className={styles.card} key={key}>
          <p className={styles.cardLabel}>{label}</p>
          <p className={styles.cardValue}>{stats[key] ?? "--"}</p>
          <div className={styles.accent} />
        </div>
      ))}
    </div>
  );
}
