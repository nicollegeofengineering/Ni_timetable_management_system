"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "@/lib/api";
import styles from "./viewtimetable.module.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, BorderStyle } from "docx";

export default function ViewTimetablePage() {
  // ---------- EXISTING STATE (keep as is) ----------
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semesterType, setSemesterType] = useState("ODD");
  const [wef, setWef] = useState("");
  const pdfContainerRef = useRef(null);

  // ---------- NEW STATE ----------
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSemester, setSelectedSemester] = useState("ODD");
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- REF for print/pdf containers ----------
  const viewRef = useRef(null);

  // ---------- CONSTANTS ----------
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

  // ---------- NEW COLUMN DEFINITIONS (BREAKS AS VERTICAL SPAN) ----------
  const columnDefs = [
    { type: "period", label: "P1", period: 1 },
    { type: "period", label: "P2", period: 2 },
    { type: "break", label: "Break I" },
    { type: "period", label: "P3", period: 3 },
    { type: "period", label: "P4", period: 4 },
    { type: "break", label: "Lunch Break" },
    { type: "period", label: "P5", period: 5 },
    { type: "period", label: "P6", period: 6 },
    { type: "break", label: "Break II" },
    { type: "period", label: "P7", period: 7 },
  ];

  useEffect(() => {
    const today = new Date();
    setWef(today.toISOString().split("T")[0]);

    const currentYear = new Date().getFullYear();
    setAcademicYear(`${currentYear}-${currentYear + 1}`);
  }, []);

  // ---------- FETCH DEPARTMENTS ----------
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/department/all");
        setDepartments(res.data.data || []);
        if (res.data.data && res.data.data.length > 0) {
          setSelectedDept(res.data.data[0].departmentCode || res.data.data[0].code);
        }
      } catch (err) {
        console.error("Failed to fetch departments:", err);
      }
    };
    fetchDepartments();
  }, []);

  // ---------- FETCH TIMETABLE ----------
  const fetchTimetable = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);
    setError("");
    try {
      const params = { academicYear, department: selectedDept };
      if (selectedYear !== "All") {
        params.year = parseInt(selectedYear);
      }
      const res = await api.get("/timetable/all", { params });
      setTimetableData(res.data.data || []);
    } catch (err) {
      setError("Failed to load timetable");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedDept, selectedYear]);

  // ---------- AUTO-FETCH ON DEPT/YEAR CHANGE ----------
  useEffect(() => {
    if (selectedDept) {
      fetchTimetable();
    }
  }, [fetchTimetable, selectedDept]);

  // ---------- GROUP TIMETABLE BY YEAR ----------
  const groupedByYear = useMemo(() => {
    const groups = {};
    timetableData.forEach((entry) => {
      const yr = entry.year;
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(entry);
    });
    return Object.keys(groups)
      .sort((a, b) => a - b)
      .map((year) => ({
        year: parseInt(year),
        entries: groups[year],
      }));
  }, [timetableData]);

  // ---------- BUILD ROWS FOR A GIVEN YEAR (NOW USES columnDefs) ----------
  const buildTimetableRows = (entries) => {
    const entryMap = {};
    entries.forEach((entry) => {
      const key = `${entry.day}|${entry.period}`;
      entryMap[key] = entry;
    });

    return days.map((day, idx) => {
      const dayNum = idx + 1;
      const periods = columnDefs.map((col) => {
        if (col.type === "break") {
          // break cells will be handled by rowSpan in the render
          return { type: "break", label: col.label };
        }
        // period cell
        const key = `${dayNum}|${col.period}`;
        const entry = entryMap[key];
        if (entry) {
          return {
            type: "period",
            subjectCode: entry.subject?.subjectCode || "",
            staffCode: entry.staff?.staffCode || "",
          };
        }
        return { type: "period", subjectCode: "", staffCode: "" };
      });
      return { day, periods };
    });
  };

  // ---------- GENERATE SUBJECT REFERENCE ----------
  const generateReference = (entries) => {
    const map = new Map();
    entries.forEach((entry) => {
      if (entry.subject && entry.staff) {
        const key = `${entry.subject._id}|${entry.staff._id}`;
        if (!map.has(key)) {
          map.set(key, {
            subjectCode: entry.subject.subjectCode,
            subjectName: entry.subject.subjectName,
            category: entry.subject.Category || "",
            staffName: entry.staff.staffName,
            staffCode: entry.staff.staffCode,
            facultyId: entry.staff.facultyId || "",
          });
        }
      }
    });
    return Array.from(map.values());
  };

  // ---------- FIND HALL FOR A YEAR ----------
  const getHallForYear = (entries) => {
    const hallEntry = entries.find((e) => e.hall);
    return hallEntry?.hall?.hallName || "";
  };

  // ---------- EXPORT PDF (unmodified aside from container) ----------
  const handleExportPDF = async () => {
    const element = viewRef.current;
    if (!element) return;
    const printEl = element.cloneNode(true);
    const filters = printEl.querySelector(`.${styles.filterBar}`);
    if (filters) filters.remove();
    const cards = printEl.querySelectorAll(`.${styles.timetableCard}`);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = "210mm";
      wrapper.style.padding = "20px";
      wrapper.style.background = "white";
      wrapper.appendChild(card.cloneNode(true));
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: 1123,
      });
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }
    pdf.save("NI_Timetable.pdf");
  };

  // ---------- RENDER ----------
  return (
    <div className={styles.mcontainer}>
      <div className={styles.container} ref={pdfContainerRef}>
        <div ref={viewRef} className={styles.viewWrapper}>
          {/* Filters Bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label>Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className={styles.filterSelect}
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.departmentCode || dept.code}>
                    {dept.departmentCode || dept.code}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="All">All</option>
                <option value="1">I</option>
                <option value="2">II</option>
                <option value="3">III</option>
                <option value="4">IV</option>
              </select>
              <select
                value={semesterType}
                onChange={(e) => setSemesterType(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="ODD">ODD</option>
                <option value="EVEN">EVEN</option>
              </select>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className={styles.filterSelect}
              >
                {useMemo(() => {
                  const currentYear = new Date().getFullYear();
                  const options = [];
                  for (let i = -1; i <= 1; i++) {
                    const start = currentYear + i;
                    const end = start + 1;
                    const label = `${start}-${end}`;
                    options.push(
                      <option key={label} value={label}>
                        {label}
                      </option>
                    );
                  }
                  return options;
                }, [])}
              </select>
            </div>
            <button onClick={fetchTimetable} className={styles.viewBtn}>
              View
            </button>
            <button onClick={handleExportPDF} className={styles.pdfBtn}>
              Export PDF
            </button>
          </div>

          {/* Loading / Error */}
          {loading && <div className={styles.loading}>Loading…</div>}
          {error && <div className={styles.error}>{error}</div>}

          {/* Timetable Containers */}
          {!loading && !error && groupedByYear.length === 0 && (
            <div className={styles.noData}>No timetable data found.</div>
          )}

          {!loading && !error && groupedByYear.map(({ year, entries }) => {
            const rows = buildTimetableRows(entries);
            const refData = generateReference(entries);
            const hall = getHallForYear(entries);
            const yearLabel = [1, 2, 3, 4][year - 1];

            return (
              <div key={year} className={styles.timetableCard}>
                {/* Card Header */}
                <div className={styles.header}>
                  <img src="/nilogo.png" alt="College Logo" width="700" height="104.3" />
                </div>

                <div className={styles.headtop}>
                  <h3>CLASS TIMETABLE</h3>
                  <span>{"("}</span>
                  <p>{academicYear}</p>
                  <span>{")-("}</span>
                  <p>{semesterType}</p>
                  <span>{")"}</span>

                </div>
                
                <div className={styles.headbottom}>
                  <p>Dep:{" "}{selectedDept}</p>
                  <p>Hall No:{" "}{hall || "—"}</p>
                  <p>YEAR/SEM:{" "}{yearLabel} / {semesterType === "ODD" ? (yearLabel*2-1) : (yearLabel*2)}</p>
                  <div className={styles.wef}>
                    <p>w.e.f:</p>
                    {" "}
                    <input type="date" value={wef} onChange={(e) => setWef(e.target.value)} />
                  </div>
                </div>

                {/* Timetable Table */}
                <table className={styles.timetableTable}>
                  <thead>
                    <tr>
                      <th>Day</th>
                      {columnDefs.map((col, idx) => (
                        <th key={idx}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.day}>
                        <td className={styles.dayCell}>{row.day}</td>
                        {row.periods.map((p, colIdx) => {
                          if (p.type === "break") {
                            // Render vertical spanning cell ONLY for the first row (Monday)
                            if (rowIndex === 0) {
                              return (
                                <td
                                  key={colIdx}
                                  rowSpan={days.length}
                                  className={styles.breakColumn}
                                >
                                  <span>{p.label}</span>
                                </td>
                              );
                            }
                            // For other rows, do not render anything (already spanned)
                            return null;
                          }
                          // Regular period cell
                          return (
                            <td key={colIdx} className={styles.periodCell}>
                              <div className={styles.cellContent}>
                                <span className={styles.subjectCode}>{p.subjectCode}</span>
                                <span className={styles.staffCode}>{p.staffCode}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subject Reference Table */}
                {refData.length > 0 && (
                  <div className={styles.referenceWrapper}>
                    <table className={styles.refTable}>
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Category</th>
                          <th>Staff Name</th>
                          <th>Staff Code</th>
                          <th>Faculty ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refData.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.subjectCode}</td>
                            <td>{item.subjectName}</td>
                            <td>{item.category}</td>
                            <td>{item.staffName}</td>
                            <td>{item.staffCode}</td>
                            <td>{item.facultyId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer */}
                <div className={styles.cardFooter}>
                  <span>HOD</span>
                  <span>PRINCIPAL</span>
                </div>
                <div className={styles.creditLine}>
                Generated via NI‑Timetable Management System | © {new Date().getFullYear()} Department of Artificial Intelligence and Data Science, Noorul Islam College of Engineering and Technology. All Rights Reserved.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}