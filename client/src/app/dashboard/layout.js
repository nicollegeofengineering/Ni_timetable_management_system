"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import styles from "./dashboard.module.css";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(false);


  if (checking) {
    return <div className={styles.loadingScreen}>Loading...</div>;
  }

  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.main}>
        <Navbar admin={admin} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
