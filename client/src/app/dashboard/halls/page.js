"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import styles from "./halls.module.css";

export default function HallsPage() {
  useEffect(() => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
      }
    },[])
  // ---------- State ----------
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Search
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState(""); // for controlled input
  const searchTimeout = useRef(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    hallName: "",
    capacity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ---------- Fetch halls with search & pagination ----------
  const fetchHalls = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/hall/all", { params });
      setHalls(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        hasNext: res.data.pagination.hasNext,
        hasPrev: res.data.pagination.hasPrev,
      }));
    } catch (err) {
      setError("Failed to load halls. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  // Debounced search: update search state after 500ms
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  };

  // Clear search
  const clearSearch = () => {
    setInputValue("");
    setSearch("");
    setPagination((prev) => ({ ...prev, page: 1 }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  };

  // Pagination controls
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // ---------- Modal handlers ----------
  const openAddModal = () => {
    setModalMode("add");
    setFormData({ hallName: "", capacity: "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (hall) => {
    setModalMode("edit");
    setFormData({
      hallName: hall.hallName.toUpperCase().trim(),
      capacity: hall.capacity.toString(),
      _id: hall._id,
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ hallName: "", capacity: "" });
    setFormError("");
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.toUpperCase().trim() }));
  };

  // Submit form (add or edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const { hallName, capacity } = formData;
    if (!hallName.trim()) {
      setFormError("Hall name is required.");
      return;
    }
    const capNum = parseInt(capacity);
    if (!capacity || isNaN(capNum) || capNum <= 0) {
      setFormError("Capacity must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "add") {
        await api.post("/hall/", {
          hallName: hallName.trim().toUpperCase(),
          capacity: capNum,
        });
      } else {
        await api.put(`/hall/${formData._id}`, {
          hallName: hallName.trim().toUpperCase(),
          capacity: capNum,
        });
      }
      closeModal();
      await fetchHalls();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete hall
  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete hall "${name}"?`)) return;
    try {
      await api.delete(`/hall/${id}`);
      await fetchHalls();
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // ---------- Render ----------
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Halls</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          + Add Hall
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by hall name..."
            className={styles.searchInput}
            value={inputValue}
            onChange={handleSearchChange}
          />
          {inputValue && (
            <button
              className={styles.clearButton}
              onClick={clearSearch}
              type="button"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className={styles.loading}>Loading halls…</div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hall Name</th>
                  <th>Capacity</th>
                  <th className={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {halls.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyMessage}>
                      No halls found. Adjust search or add a new hall.
                    </td>
                  </tr>
                ) : (
                  halls.map((item, index) => (
                    <tr key={item._id}>
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td>{item.hallName}</td>
                      <td>{item.capacity}</td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item._id, item.hallName)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === "add" ? "Add Hall" : "Edit Hall"}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="hallName">Hall Name</label>
                <input
                  type="text"
                  id="hallName"
                  name="hallName"
                  value={formData.hallName}
                  onChange={handleFormChange}
                  placeholder="e.g., Main Auditorium"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="capacity">Capacity</label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleFormChange}
                  placeholder="e.g., 200"
                  min="1"
                  required
                />
                <small className={styles.helper}>Number of seats (must be positive).</small>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving…"
                    : modalMode === "add"
                    ? "Add Hall"
                    : "Update Hall"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}