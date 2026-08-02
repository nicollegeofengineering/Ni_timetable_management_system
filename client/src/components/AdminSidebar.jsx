"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  DoorOpen,
  CalendarRange,
  CalendarClock,
  ClipboardCheck,
  LogOut,
  DoorClosed,
} from "lucide-react";
import api from "@/lib/api";
import styles from "./AdminSidebar.module.css";
import { href } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Departments", href: "/dashboard/departments", icon: Building2 },
  { label: "Staff", href: "/dashboard/staff", icon: Users },
  { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen },
  { label: "Halls", href: "/dashboard/halls", icon: DoorOpen },
  { label: "Master Timetable", href: "/dashboard/timetable", icon: CalendarClock },
  { label: "View Timetable", href: "/dashboard/viewtimetable", icon: CalendarRange },
  { label: "Staff Timetable", href: "/dashboard/stafftimetable", icon: ClipboardCheck },
  {label:"Hall Timetable",href:"/dashboard/halltimetable",icon:DoorClosed},
  {label:"News",href:"/dashboard/news",icon:ClipboardCheck},
  {label:"Admissions",href:"/dashboard/admissions",icon:ClipboardCheck},

];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    router.push("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <p className={styles.brandTitle}>Noorul Islam College</p>
        <span className={styles.brandSubtitle}>Timetable Admin</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${isActive ? styles.linkActive : ""}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
