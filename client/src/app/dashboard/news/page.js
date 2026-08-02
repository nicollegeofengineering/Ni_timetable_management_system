"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import styles from "./news.module.css";

export default function NewsPage() {
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) window.location.href = "/login";
  }, []);

  // ---------- State ----------
  const [newsItems, setNewsItems] = useState([]);
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
  const [inputValue, setInputValue] = useState("");
  const searchTimeout = useRef(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    author: "",
    status: "published",
    date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ---------- Fetch News ----------
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/news/admin", { params });
      setNewsItems(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        hasNext: res.data.pagination.hasNext,
        hasPrev: res.data.pagination.hasPrev,
      }));
    } catch (err) {
      setError("Failed to load news. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Debounced search
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

  // Pagination
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // ---------- Modal ----------
  const openAddModal = () => {
    setModalMode("add");
    setFormData({ title: "", content: "", author: "", status: "published", date: "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setFormData({
      title: item.title,
      content: item.content || "",
      author: item.author || "",
      status: item.status,
      date: item.date ? item.date.split("T")[0] : "",
      _id: item._id,
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ title: "", content: "", author: "", status: "published", date: "" });
    setFormError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const { title, content, author, status, date } = formData;
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        author: author.trim() || "Admin",
        status,
        date: date || undefined,
      };

      if (modalMode === "add") {
        await api.post("/news/", payload);
      } else {
        await api.put(`/news/${formData._id}`, payload);
      }
      closeModal();
      await fetchNews();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete news: "${title}"?`)) return;
    try {
      await api.delete(`/news/${id}`);
      await fetchNews();
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ---------- Render ----------
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>News & Announcements</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          + Add News
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by title or content..."
            className={styles.searchInput}
            value={inputValue}
            onChange={handleSearchChange}
          />
          {inputValue && (
            <button className={styles.clearButton} onClick={clearSearch} type="button">
              ✕
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading news…</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {newsItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyMessage}>
                      No news found. Add a new announcement.
                    </td>
                  </tr>
                ) : (
                  newsItems.map((item, index) => (
                    <tr key={item._id}>
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td className={styles.titleCell}>{item.title}</td>
                      <td>{item.author || "Admin"}</td>
                      <td>
                        <span className={item.status === "published" ? styles.statusPublished : styles.statusDraft}>
                          {item.status}
                        </span>
                      </td>
                      <td>{formatDate(item.date)}</td>
                      <td className={styles.actionsCell}>
                        <button className={styles.editButton} onClick={() => openEditModal(item)}>
                          Edit
                        </button>
                        <button className={styles.deleteButton} onClick={() => handleDelete(item._id, item.title)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
              <h2>{modalMode === "add" ? "Add News" : "Edit News"}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g., College Annual Day"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="content">Content (optional)</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleFormChange}
                  placeholder="Full announcement text..."
                  rows="3"
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="author">Author</label>
                  <input
                    type="text"
                    id="author"
                    name="author"
                    value={formData.author}
                    onChange={handleFormChange}
                    placeholder="e.g., Admin"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className={styles.select}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="date">Date (optional)</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                />
                <small className={styles.helper}>Leave empty to use current date.</small>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={submitting}>
                  {submitting ? "Saving…" : modalMode === "add" ? "Add News" : "Update News"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}