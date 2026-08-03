"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import styles from "./admissions.module.css";

export default function AdmissionsPage() {
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) window.location.href = "/login";
  }, []);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchTimeout = useRef(null);

  const [selectedApp, setSelectedApp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/admission/admin/applications", { params });
      setApplications(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError("Failed to load applications.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  };

  const clearSearch = () => {
    setInputValue("");
    setSearch("");
    setPagination((prev) => ({ ...prev, page: 1 }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const openModal = (app) => {
    setSelectedApp(app);
    setAdminComment(app.adminComment || "");
    setNewStatus(app.status);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedApp(null);
  };

  const updateApplication = async () => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await api.put(`/admission/admin/${selectedApp._id}`, {
        status: newStatus,
        adminComment: adminComment,
      });
      closeModal();
      fetchApplications();
    } catch (err) {
      alert("Failed to update application.");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admission Applications</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by name, email, hall ticket..."
            className={styles.searchInput}
            value={inputValue}
            onChange={handleSearchChange}
          />
          {inputValue && (
            <button className={styles.clearButton} onClick={clearSearch} type="button">✕</button>
          )}
        </div>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Hall Ticket</th><th>Email</th><th>Branch</th><th>Cutoff</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan="9" className={styles.emptyMessage}>No applications found.</td></tr>
                ) : (
                  applications.map((app, idx) => (
                    <tr key={app._id}>
                      <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                      <td>{app.name}</td>
                      <td>{app.hallTicketNo}</td>
                      <td>{app.email}</td>
                      <td>{app.branchPreferred}</td>
                      <td>{app.cutoffMark !== undefined && app.cutoffMark !== null ? app.cutoffMark : "—"}</td>
                      <td>
                        <span className={app.status === "accepted" ? styles.statusAccepted : app.status === "rejected" ? styles.statusRejected : styles.statusPending}>
                          {app.status}
                        </span>
                      </td>
                      <td>{formatDate(app.submittedAt)}</td>
                      <td>
                        <button className={styles.viewButton} onClick={() => openModal(app)}>View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button onClick={() => goToPage(pagination.page - 1)} disabled={!pagination.hasPrev} className={styles.pageButton}>Previous</button>
            <span className={styles.pageInfo}>Page {pagination.page} of {pagination.totalPages || 1}</span>
            <button onClick={() => goToPage(pagination.page + 1)} disabled={!pagination.hasNext} className={styles.pageButton}>Next</button>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && selectedApp && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Application Details</h2>
              <button className={styles.modalClose} onClick={closeModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}><strong>Name:</strong> {selectedApp.name}</div>
              <div className={styles.detailRow}><strong>Father:</strong> {selectedApp.fatherName}</div>
              <div className={styles.detailRow}><strong>Hall Ticket:</strong> {selectedApp.hallTicketNo}</div>
              <div className={styles.detailRow}><strong>DOB:</strong> {formatDate(selectedApp.dob)}</div>
              <div className={styles.detailRow}><strong>Gender:</strong> {selectedApp.gender}</div>
              <div className={styles.detailRow}><strong>Religion:</strong> {selectedApp.religion}</div>
              <div className={styles.detailRow}><strong>Community:</strong> {selectedApp.community}</div>
              <div className={styles.detailRow}><strong>Residence:</strong> {selectedApp.residenceAddress}</div>
              <div className={styles.detailRow}><strong>Permanent:</strong> {selectedApp.permanentAddress}</div>
              <div className={styles.detailRow}><strong>District:</strong> {selectedApp.district}</div>
              <div className={styles.detailRow}><strong>State:</strong> {selectedApp.state}</div>
              <div className={styles.detailRow}><strong>Pincode:</strong> {selectedApp.pincode}</div>
              <div className={styles.detailRow}><strong>Mobile:</strong> {selectedApp.mobile}</div>
              <div className={styles.detailRow}><strong>Parent Mobile:</strong> {selectedApp.parentMobile}</div>
              <div className={styles.detailRow}><strong>Email:</strong> {selectedApp.email}</div>
              <div className={styles.detailRow}><strong>Admission For:</strong> {selectedApp.admissionFor}</div>
              <div className={styles.detailRow}><strong>Branch:</strong> {selectedApp.branchPreferred}</div>
                <div className={styles.detailRow}><strong>Department:</strong> {selectedApp.department}</div>
              <div className={styles.detailRow}><strong>Cutoff Mark:</strong> {selectedApp.cutoffMark !== undefined && selectedApp.cutoffMark !== null ? selectedApp.cutoffMark : "—"}</div>
              <div className={styles.detailRow}><strong>Submitted:</strong> {new Date(selectedApp.submittedAt).toLocaleString()}</div>

              <div className={styles.formGroup}>
                <label htmlFor="adminComment">Admin Comment</label>
                <textarea id="adminComment" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} rows="3" className={styles.textarea} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="statusSelect">Status</label>
                <select id="statusSelect" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={styles.select}>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeModal}>Cancel</button>
              <button className={styles.saveButton} onClick={updateApplication} disabled={updating}>
                {updating ? "Updating…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}