"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import styles from "./staff.module.css";

export default function StaffPage() {
  useEffect(() => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
      }
    },[])
  // ---------- State ----------
  const [staff, setStaff] = useState([]);
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
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    _id: null, // <-- ADD THIS: Store the MongoDB _id
    staffName: "",
    staffCode: "",
    staffId: "",
    facultyId: "",
    department: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Ref for debounce
  const searchTimeout = useRef(null);

  // ---------- Fetch departments (for dropdown) ----------
  const fetchDepartments = async () => {
    try {
      const res = await api.get("/department/all");
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ---------- Fetch staff with filters & pagination ----------
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (departmentFilter) params.department = departmentFilter;

      const res = await api.get("/staff/all", { params });
      setStaff(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        hasNext: res.data.pagination.hasNext,
        hasPrev: res.data.pagination.hasPrev,
      }));
    } catch (err) {
      setError("Failed to load staff. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, departmentFilter]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Debounced search: update search state after 500ms pause
  const handleSearchChange = (e) => {
    setDepartmentFilter("");
    const value = e.target.value;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 })); // reset to page 1 on new search
    }, 500);
  };

  // Department filter change
  const handleDepartmentChange = (e) => {
    setSearch(""); 
    setDepartmentFilter(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Pagination controls
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // ---------- Modal handlers ----------
  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      _id: null, // <-- Set to null for add mode
      staffName: "",
      staffCode: "",
      staffId: "",
      facultyId: "",
      department: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (staffItem) => {
    // Make sure we have the _id
    const staffId = staffItem._id || staffItem.id;
    
    if (!staffId) {
      console.error("No ID found in staff object:", staffItem);
      alert("Error: Staff ID not found");
      return;
    }

    setModalMode("edit");
    setFormData({
      _id: staffId, // <-- CRITICAL: Store the _id here
      staffName: staffItem.staffName || "",
      staffCode: staffItem.staffCode || "",
      staffId: staffItem.staffId || "",
      facultyId: staffItem.facultyId || "",
      department: staffItem.department?._id || staffItem.department || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      _id: null,
      staffName: "",
      staffCode: "",
      staffId: "",
      facultyId: "",
      department: "",
    });
    setFormError("");
  };

  const handleClearFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit form (add or edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const { staffName, staffCode, staffId, facultyId, department, _id } = formData;
    
    // Validate required fields
    if (!staffName || !staffName.trim()) {
      setFormError("Staff name is required");
      return;
    }
    if (!staffCode || !staffCode.trim()) {
      setFormError("Staff code is required");
      return;
    }
    if (!staffId || !staffId.trim()) {
      setFormError("Staff ID is required");
      return;
    }
    if (!facultyId || !facultyId.trim()) {
      setFormError("Faculty ID is required");
      return;
    }
    if (!department) {
      setFormError("Department is required");
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "add") {
        // Create new staff
        await api.post("/staff/", {
          staffName: staffName.trim(),
          staffCode: staffCode.trim().toUpperCase(),
          staffId: staffId.trim().toUpperCase(),
          facultyId: facultyId.trim().toUpperCase(),
          department,
        });
      } else {
        // EDIT MODE: Use _id from formData
        if (!_id) {
          console.error("No _id in formData:", formData);
          setFormError("Staff ID not found for update. Please try again.");
          return;
        }

        console.log("Updating staff with ID:", _id); // Debug log
        
        await api.put(`/staff/${_id}`, {
          staffName: staffName.trim(),
          staffId: staffId.trim().toUpperCase(),
          facultyId: facultyId.trim().toUpperCase(),
          department,
        });
      }
      
      closeModal();
      // Refresh list (stay on current page)
      await fetchStaff();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed. Please try again.";
      setFormError(msg);
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete staff
  const handleDelete = async (id, name) => {
    // Validate ID
    if (!id) {
      alert("Invalid staff ID");
      return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${name || 'this staff member'}"?`)) {
      return;
    }

    try {
      await api.delete(`/staff/${id}`);
      // Refresh current page
      await fetchStaff();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Delete failed. Please try again.";
      alert(`Delete failed: ${errorMsg}`);
      console.error("Delete error:", err);
    }
  };

  // ---------- Render ----------
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Staff Management</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          + Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name..."
          className={styles.searchInput}
          onChange={handleSearchChange}
          defaultValue={search}
        />
        <select
          className={styles.departmentSelect}
          value={departmentFilter}
          onChange={handleDepartmentChange}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept._id}>
              {dept.name} ({dept.code})
            </option>
          ))}
        </select>
        <button onClick={handleClearFilters} className={styles.clearButton}>
          clear
        </button>
      </div>

      {/* Error banner */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className={styles.loading}>Loading staff…</div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Staff ID</th>
                  <th>Faculty ID</th>
                  <th>Department</th>
                  <th className={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyMessage}>
                      No staff found. Adjust filters or add new staff.
                    </td>
                  </tr>
                ) : (
                  staff.map((item, index) => (
                    <tr key={item._id}>
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td>{item.staffName}</td>
                      <td>{item.staffCode}</td>
                      <td>{item.staffId}</td>
                      <td>{item.facultyId}</td>
                      <td>
                        {item.department
                          ? `${item.department.name} (${item.department.code})`
                          : "—"}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item._id, item.staffName)}
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
              <h2>{modalMode === "add" ? "Add Staff" : "Edit Staff"}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="staffName">Full Name</label>
                <input
                  type="text"
                  id="staffName"
                  name="staffName"
                  value={formData.staffName}
                  onChange={handleFormChange}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="staffCode">Staff Code</label>
                <input
                  type="text"
                  id="staffCode"
                  name="staffCode"
                  value={formData.staffCode}
                  onChange={handleFormChange}
                  placeholder="e.g., STF001"
                  readOnly={modalMode === "edit"} // staffCode cannot be updated
                  className={modalMode === "edit" ? styles.readOnly : ""}
                  required
                />
                {modalMode === "edit" && (
                  <small className={styles.helper}>Code cannot be changed.</small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="staffId">Staff ID</label>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleFormChange}
                  placeholder="e.g., emp001"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="facultyId">Faculty ID</label>
                <input
                  type="text"
                  id="facultyId"
                  name="facultyId"
                  value={formData.facultyId}
                  onChange={handleFormChange}
                  placeholder="e.g., fac001"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
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
                    ? "Add Staff"
                    : "Update Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}