"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import styles from "./subjects.module.css";

export default function SubjectsPage() {
  useEffect(() => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
      }
    },[])
  // ---------- State ----------
  const [subjects, setSubjects] = useState([]);
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

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    subjectName: "",
    subjectCode: "",
    Category: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Ref for debounce
  const searchTimeout = useRef(null);


  // ---------- Fetch subjects with filters & pagination ----------
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get("/subject/all", { params });
      setSubjects(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        hasNext: res.data.pagination.hasNext,
        hasPrev: res.data.pagination.hasPrev,
      }));
    } catch (err) {
      setError("Failed to load subjects. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, categoryFilter]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value.toUpperCase(); 
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  };

  

  // Pagination controls
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // ---------- Modal handlers ----------
  const openAddModal = () => {
    setModalMode("add");
    setFormData({ subjectName: "", subjectCode: "", Category: "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (subject) => {
    setModalMode("edit");
    setFormData({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode, // read-only
      Category: subject.Category,
      _id: subject._id,
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ subjectName: "", subjectCode: "", Category: "" });
    setFormError("");
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
  };
const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  // Submit form (add or edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const { subjectName, subjectCode, Category } = formData;
    if (!subjectName.trim() || !subjectCode.trim() || !Category.trim()) {
      setFormError("All fields are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "add") {
        await api.post("/subject/", {
          subjectName: subjectName.trim(),
          subjectCode: subjectCode.trim(),
          Category: Category.trim(),
        });
      } else {
        // Edit: subjectCode cannot be updated
        await api.put(`/subject/${formData._id}`, {
          subjectName: subjectName.trim(),
          Category: Category.trim(),
        });
      }
      closeModal();
      await fetchSubjects(); // refresh list
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete subject
  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/subject/${id}`);
      await fetchSubjects();
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // ---------- Render ----------
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Subjects</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          + Add Subject
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name or code..."
          className={styles.searchInput}
          onChange={handleSearchChange}
          defaultValue={search}
        />
        <button onClick={handleClearFilters} className={styles.clearButton}>
          Clear Filters</button>
      </div>

      {/* Error banner */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className={styles.loading}>Loading subjects…</div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th className={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyMessage}>
                      No subjects found. Adjust filters or add a new subject.
                    </td>
                  </tr>
                ) : (
                  subjects.map((item, index) => (
                    <tr key={item._id}>
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td>{item.subjectName}</td>
                      <td>{item.subjectCode}</td>
                      <td>{item.Category}</td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item._id, item.subjectName)}
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
              <h2>{modalMode === "add" ? "Add Subject" : "Edit Subject"}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="subjectName">Subject Name</label>
                <input
                  type="text"
                  id="subjectName"
                  name="subjectName"
                  value={formData.subjectName}
                  onChange={handleFormChange}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subjectCode">Subject Code</label>
                <input
                  type="text"
                  id="subjectCode"
                  name="subjectCode"
                  value={formData.subjectCode}
                  onChange={handleFormChange}
                  placeholder="e.g., MATH101"
                  readOnly={modalMode === "edit"}
                  className={modalMode === "edit" ? styles.readOnly : ""}
                  required
                />
                {modalMode === "edit" && (
                  <small className={styles.helper}>Code cannot be changed.</small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="Category">Category</label>
                <input
                  type="text"
                  id="Category"
                  name="Category"
                  value={formData.Category}
                  onChange={handleFormChange}
                  placeholder="e.g., Science"
                  required
                />
                <small className={styles.helper}>
                  Category must be unique (case‑insensitive).
                </small>
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
                    ? "Add Subject"
                    : "Update Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}