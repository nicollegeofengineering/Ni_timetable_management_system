"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/api";
import styles from "./staff-timetable.module.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function StaffTimetablePage() {
  // Redirect if not logged in
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) window.location.href = "/login";
  }, []);

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semesterType, setSemesterType] = useState("ODD");
  const [wef, setWef] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffTimetableData, setStaffTimetableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const pdfContainerRef = useRef(null);
  const searchRef = useRef(null);

  // ---------- COLUMN DEFINITIONS ----------
  // "period" columns render normally per-row.
  // "merge" columns (Break/Lunch) are rendered ONCE per table,
  // as a single vertical cell spanning all day-rows.
  const columns = [
    { type: "period", label: "P1", period: 1 },
    { type: "period", label: "P2", period: 2 },
    { type: "merge", label: "BREAK", key: "break1" },
    { type: "period", label: "P3", period: 3 },
    { type: "period", label: "P4", period: 4 },
    { type: "merge", label: "LUNCH", key: "lunch" },
    { type: "period", label: "P5", period: 5 },
    { type: "period", label: "P6", period: 6 },
    { type: "merge", label: "BREAK", key: "break2" },
    { type: "period", label: "P7", period: 7 },
  ];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

  // ---------- INITIAL FETCHES ----------
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setAcademicYear(`${currentYear}-${currentYear + 1}`);

    const fetchStaff = async () => {
      try {
        const res = await api.get("/staff/all", { params: { limit: 1000 } });
        setStaffList(res.data.data || []);
      } catch (err) {
        console.error("Failed to load staff list", err);
      }
    };
    fetchStaff();

    setWef(new Date().toISOString().split("T")[0]);
  }, []);

  // ---------- FETCH STAFF TIMETABLE ----------
  const fetchStaffTimetable = async (staffId = null, search = "") => {
    setLoading(true);
    try {
      const params = { academicYear };
      if (staffId) {
        params.staffId = staffId;
      } else if (search) {
        params.search = search;
      }

      const res = await api.get("/timetable/staffview", { params });
      setStaffTimetableData(res.data.data || []);
    } catch (err) {
      console.error("Failed to load staff timetable", err);
      setStaffTimetableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!academicYear) return;
    if (selectedStaff) {
      fetchStaffTimetable(selectedStaff._id);
    } else {
      setStaffTimetableData([]);
    }
  }, [academicYear, selectedStaff]);

  // ---------- FILTERED STAFF LIST FOR DROPDOWN ----------
  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList;
    const q = searchQuery.toUpperCase();
    return staffList.filter(s =>
      s.staffName?.toUpperCase().includes(q) ||
      s.staffCode?.toUpperCase().includes(q)
    );
  }, [staffList, searchQuery]);

  // ---------- GROUP DATA FOR TABLE ----------
  const timetableMatrix = useMemo(() => {
    if (!staffTimetableData.length) return {};
    const matrix = {};
    staffTimetableData.forEach(entry => {
      if (!entry.staff || !entry.subject) return;
      const key = `${entry.day}__${entry.period}`;
      matrix[key] = {
        department: entry.department,
        year: entry.year,
        subjectCode: entry.subject.subjectCode,
        subjectName: entry.subject.subjectName,
      };
    });
    return matrix;
  }, [staffTimetableData]);

  // ---------- UNIQUE SUBJECTS FOR THIS STAFF (reference table) ----------
  const staffSubjects = useMemo(() => {
    if (!staffTimetableData.length) return [];
    const seen = new Map();
    staffTimetableData.forEach(entry => {
      if (!entry.subject || !entry.staff) return;
      const sub = entry.subject;
      const key = sub._id;
      if (!seen.has(key)) {
        seen.set(key, {
          subjectCode: sub.subjectCode,
          subjectName: sub.subjectName,
          category: sub.Category || sub.category || "",
        });
      }
    });
    return Array.from(seen.values());
  }, [staffTimetableData]);

  // ---------- PDF EXPORT ----------
  const trimCanvasBottom = (canvas) => {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    let lastNonBlankRow = 0;

    for (let y = height - 1; y >= 0; y--) {
      let rowHasContent = false;
      const rowStart = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowStart + x * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        const a = imageData[idx + 3];
        if (a > 0 && !(r > 250 && g > 250 && b > 250)) {
          rowHasContent = true;
          break;
        }
      }
      if (rowHasContent) {
        lastNonBlankRow = y;
        break;
      }
    }

    const padding = 20;
    const trimmedHeight = Math.min(height, lastNonBlankRow + padding);

    if (trimmedHeight >= height) return canvas;

    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = width;
    trimmedCanvas.height = trimmedHeight;
    trimmedCanvas.getContext("2d").drawImage(canvas, 0, 0);
    return trimmedCanvas;
  };

  const handleDownloadPdf = async () => {
    const element = pdfContainerRef.current;
    if (!element) return;

    const images = element.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    element.style.overflow = "visible";
    element.style.maxHeight = "none";

    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      let canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty – check logo or visibility.");
      }

      canvas = trimCanvasBottom(canvas);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = pdfWidth / canvas.width;
      const pageHeightInCanvasPx = Math.floor(pdfHeight / ratio);

      let renderedHeight = 0;
      let pageNum = 0;

      while (renderedHeight < canvas.height) {
        const remaining = canvas.height - renderedHeight;
        let sliceHeight = Math.min(pageHeightInCanvasPx, Math.round(remaining));

        if (sliceHeight < 1) break;

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0, renderedHeight, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );

        const dataUrl = pageCanvas.toDataURL("image/png");

        if (!dataUrl || dataUrl === "data:," || dataUrl.length < 50) {
          console.error("Empty slice canvas, skipping page", pageNum);
          renderedHeight += sliceHeight;
          continue;
        }

        if (pageNum > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, sliceHeight * ratio);

        renderedHeight += sliceHeight;
        pageNum++;
      }

      const filename = selectedStaff
        ? `StaffTimetable_${selectedStaff.staffCode || selectedStaff.staffName}.pdf`
        : "StaffTimetable.pdf";
      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Top controls */}
      <div className={styles.controls}>
        <select
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          className={styles.filterSelect}
        >
          {(() => {
            const currentYear = new Date().getFullYear();
            const options = [];
            for (let i = -1; i <= 1; i++) {
              const start = currentYear + i;
              const end = start + 1;
              const label = `${start}-${end}`;
              options.push(<option key={label} value={label}>{label}</option>);
            }
            return options;
          })()}
        </select>

        <select
          value={semesterType}
          onChange={e => setSemesterType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ODD">ODD</option>
          <option value="EVEN">EVEN</option>
        </select>

        <div className={styles.searchContainer} ref={searchRef}>
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className={styles.searchInput}
          />
          {showDropdown && filteredStaff.length > 0 && (
            <ul className={styles.dropdown}>
              {filteredStaff.slice(0, 20).map(staff => (
                <li
                  key={staff._id}
                  onClick={() => {
                    setSelectedStaff(staff);
                    setSearchQuery(`${staff.staffCode || ""} - ${staff.staffName}`);
                    setShowDropdown(false);
                  }}
                >
                  {staff.staffCode} - {staff.staffName}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          className={styles.clearbtn}
          onClick={() => {
            setSelectedStaff(null);
            setSearchQuery("");
            setShowDropdown(false);
          }}
        >
          Clear
        </button>

        <button
          onClick={handleDownloadPdf}
          className={styles.pdfButton}
          disabled={!selectedStaff}
        >
          DOWNLOAD PDF
        </button>
      </div>

      {/* Timetable display */}
      <div className={styles.container} ref={pdfContainerRef}>
        <div className={styles.header}>
          <img src="/nilogo.png" alt="College Logo" width="700" height="104.3" />
        </div>

        <div className={styles.titleRow}>
          <h3>STAFF TIMETABLE</h3>
          <span> ({academicYear}) </span>
          <span> ({semesterType}) </span>
        </div>

        <div className={styles.wefRow}>
          <p>w.e.f: <input type="date" value={wef} readOnly /></p>
        </div>

        {selectedStaff && (
          <div className={styles.staffInfo}>
            <p><strong>Staff Name:</strong> {selectedStaff.staffName}</p>
            <p><strong>Staff Code:</strong> {selectedStaff.staffCode}</p>
            <p><strong>Faculty ID:</strong> {selectedStaff.facultyId || "---"}</p>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.staffTable}>
            {/* Fixed column widths so periods with/without a subject stay identical width */}
            <colgroup>
              <col className={styles.colDay} />
              {columns.map((col, i) => (
                <col
                  key={i}
                  className={col.type === "merge" ? styles.colBreak : styles.colPeriod}
                />
              ))}
            </colgroup>

            <thead>
              <tr>
                <th className={styles.dayHead}>Day</th>
                {columns.map((col, i) => (
                  <th key={i}>{col.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!selectedStaff ? (
                <tr>
                  <td colSpan={columns.length + 1} className={styles.emptyMsg}>
                    Select a staff member to view their timetable
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className={styles.emptyMsg}>
                    Loading...
                  </td>
                </tr>
              ) : (
                days.map((day, dayIdx) => {
                  const dayNum = dayMap[day];
                  return (
                    <tr key={day}>
                      <td className={styles.dayCell}>{day}</td>
                      {columns.map((col, idx) => {
                        if (col.type === "merge") {
                          // Only render this cell once, on the first row,
                          // spanning all day-rows vertically.
                          if (dayIdx !== 0) return null;
                          return (
                            <td
                              key={col.key}
                              className={styles.breakColumn}
                              rowSpan={days.length}
                            >
                              <span>{col.label}</span>
                            </td>
                          );
                        }

                        const key = `${dayNum}__${col.period}`;
                        const slot = timetableMatrix[key];
                        return (
                          <td key={idx} className={styles.periodCell}>
                            <div className={styles.periodContent}>
                              {slot ? (
                                <>
                                  <span className={styles.classInfo}>
                                    {slot.department} {slot.year}
                                  </span>
                                  <span className={styles.subjectCode}>
                                    {slot.subjectCode}
                                  </span>
                                </>
                              ) : (
                                <span className={styles.emptyCell}>-</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Subject reference table */}
        {selectedStaff && staffSubjects.length > 0 && (
          <div className={styles.srWrapper}>
            <table className={styles.srTable}>
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {staffSubjects.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.subjectCode}</td>
                    <td className={styles.leftAlign}>{row.subjectName}</td>
                    <td>{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.creditLine}>
            Generated via NI‑Timetable Management System | © {new Date().getFullYear()} Department of Artificial Intelligence and Data Science, Noorul Islam College of Engineering and Technology. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
}