"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./event-form.module.css";
import { useToast } from "@/components/common/toast";
import { useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ORG_BASE = `${API_BASE}/org/organisationAdmin`; // keep for other org APIs

// Helper to format a date string to input[type=datetime-local] value (local timezone)
const toLocalInputValue = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const EventForm = () => {
  const { toast } = useToast();
  const [allowed, setAllowed] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgLoading, setOrgLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(false);

  const editParam = searchParams.get("edit");
  useEffect(() => {
    setIsEditMode(Boolean(editParam));
    setEventId(editParam || null);
  }, [editParam]);

  useEffect(() => {
    const ac = new AbortController();

    async function loadOrg() {
      try {
        setOrgLoading(true);
        // Probe membership (owner or assigned admin)
        const res = await fetch(`${API_BASE}/org-admin/organisation/is-member`, {
          credentials: "include",
          signal: ac.signal,
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.status === 401) {
          toast.info("Please login to manage events.");
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (res.ok && data?.orgAdmin && data?.organisationId) {
          const oid = String(data.organisationId);
          setOrgId(oid);
          setAllowed(true);
        } else {
          router.push("/create-organisation");
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setSubmitError("Could not verify organisation access. Retry or refresh.");
      } finally {
        if (!ac.signal.aborted) setOrgLoading(false);
      }
    }

    loadOrg();
    return () => ac.abort();
  }, [router, toast, ORG_BASE]);

  // Load event data (edit mode)
  useEffect(() => {
    if (!isEditMode || !eventId || !orgId) return;
    const ac = new AbortController();

    async function loadEvent() {
      try {
        setEventLoading(true);
        const res = await fetch(
          `${API_BASE}/org-admin/organisation/${orgId}/event/${eventId}`,
          { credentials: "include", signal: ac.signal }
        );
        if (res.status === 401) {
          toast.error("Login required");
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load event data");

        const eventData = await res.json();
        setFormData((prev) => ({
          ...prev,
          title: eventData.title || "",
          description: eventData.description || "",
          registeration_deadline: toLocalInputValue(eventData.registeration_deadline),
          start_date: toLocalInputValue(eventData.start_date),
          end_date: toLocalInputValue(eventData.end_date),
          venue: eventData.venue || "",
          mode: eventData.mode || "offline",
          price: eventData.price ? String(eventData.price) : "",
          max_attendees: eventData.max_attendees ? String(eventData.max_attendees) : "",
          organiser_contact: eventData.organiser_contact || "",
          posterImage: null,
        }));
        if (eventData.imageUrl) setImagePreview(eventData.imageUrl);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setSubmitError("Failed to load event data.");
      } finally {
        if (!ac.signal.aborted) setEventLoading(false);
      }
    }
    loadEvent();
    return () => ac.abort();
  }, [isEditMode, eventId, orgId, router, toast]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    registeration_deadline: "",
    start_date: "",
    end_date: "",
    venue: "",
    mode: "offline",
    price: "",
    max_attendees: "",
    organiser_contact: "",
    posterImage: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, posterImage: "Only .jpg, .png, or .webp images are allowed." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, posterImage: "Image size should be less than 5MB." }));
      return;
    }
    setFormData((prev) => ({ ...prev, posterImage: file }));
    setErrors((prev) => ({ ...prev, posterImage: "" }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setSubmitError("");
    setErrors({});

    if (!orgId || !allowed) {
      setSubmitError("Organisation access not verified. Please refresh the page.");
      return;
    }

    // Client-side datetime validation
    const regDt = new Date(formData.registeration_deadline);
    const startDt = new Date(formData.start_date);
    const endDt = new Date(formData.end_date);
    const now = new Date();

    const localErrors = {};
    if (!formData.registeration_deadline || isNaN(regDt)) localErrors.registeration_deadline = "Valid registration deadline required.";
    if (!formData.start_date || isNaN(startDt)) localErrors.start_date = "Valid start date required.";
    if (!formData.end_date || isNaN(endDt)) localErrors.end_date = "Valid end date required.";

    if (!localErrors.registeration_deadline && regDt < now) {
      localErrors.registeration_deadline = "Deadline cannot be in the past.";
    }
    if (!localErrors.registeration_deadline && !localErrors.start_date && regDt > startDt) {
      localErrors.registeration_deadline = "Deadline must be ≤ start date.";
    }
    if (!localErrors.start_date && !localErrors.end_date && endDt < startDt) {
      localErrors.end_date = "End date must be ≥ start date.";
    }

    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      setSubmitError("Fix the highlighted date/time fields.");
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      Object.entries({
        title: formData.title,
        description: formData.description,
        registeration_deadline: formData.registeration_deadline,
        start_date: formData.start_date,
        end_date: formData.end_date,
        venue: formData.venue,
        mode: formData.mode,
        price: formData.price || "0",
        max_attendees: formData.max_attendees || "",
        organiser_contact: formData.organiser_contact,
      }).forEach(([k, v]) => formDataToSend.append(k, v));

      if (formData.posterImage) formDataToSend.append("image", formData.posterImage);

      const endpoint = isEditMode
        ? `${API_BASE}/org-admin/organisation/${orgId}/edit-existing-event/${eventId}`
        : `${API_BASE}/org-admin/organisation/${orgId}/register-new-event`;

      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        credentials: "include",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Login required");
          router.replace("/login");
          return;
        }
        if (result?.data && Array.isArray(result.data)) {
          const backendErrors = {};
          result.data.forEach((err) => {
            if (err.type === "field" && err.path) backendErrors[err.path] = err.msg;
          });
          setErrors(backendErrors);
          setSubmitError("Please fix the highlighted fields.");
        } else {
          setSubmitError(result.message || "Something went wrong!");
        }
        return;
      }

      toast.success(result.message || (isEditMode ? "Event updated" : "Event created"));
      router.push("/admin/events");
    } catch (error) {
      setSubmitError(error.message || "Something went wrong!");
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !eventId || loading) return;

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      toast.info("Click 'Confirm Delete' to proceed.");
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 5000);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/org-admin/organisation/${orgId}/delete-event/${eventId}`,
        { method: "DELETE", credentials: "include" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete event.");
      }

      toast.success("Event deleted successfully.");
      router.push("/admin/events");
    } catch (err) {
      setSubmitError(err.message || "Delete failed");
      toast.error(err.message || "Delete failed");
    } finally {
      setLoading(false);
      setConfirmingDelete(false);
    }
  };

  // Render
  const nowLocal = toLocalInputValue(new Date());
  const startLocal = formData.start_date || "";
  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>{isEditMode ? "Edit Event" : "Create Event"}</h1>

        {submitError && <div className={styles.errorAlert}>{submitError}</div>}

        {(orgLoading || (isEditMode && eventLoading)) && (
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              {orgLoading ? "Checking access..." : "Loading event data..."}
            </p>
          </div>
        )}

        {!orgLoading && allowed && (!isEditMode || !eventLoading) && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Event Title */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter event title..."
                className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
              />
              {errors.title && <span className={styles.errorText}>{errors.title}</span>}
            </div>

            {/* Date Row */}
            <div className={styles.row}>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Registration Deadline *</label>
                <input
                  type="datetime-local"
                  name="registeration_deadline"
                  value={formData.registeration_deadline}
                  onChange={handleInputChange}
                  min={nowLocal}
                  max={startLocal || undefined}
                  className={`${styles.input} ${errors.registeration_deadline ? styles.inputError : ""}`}
                />
                {errors.registeration_deadline && (
                  <span className={styles.errorText}>{errors.registeration_deadline}</span>
                )}
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Start Date *</label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={nowLocal}
                  className={`${styles.input} ${errors.start_date ? styles.inputError : ""}`}
                />
                {errors.start_date && <span className={styles.errorText}>{errors.start_date}</span>}
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>End Date *</label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={startLocal || nowLocal}
                  className={`${styles.input} ${errors.end_date ? styles.inputError : ""}`}
                />
                {errors.end_date && <span className={styles.errorText}>{errors.end_date}</span>}
              </div>
            </div>

            {/* Venue */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Venue *</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                placeholder="Enter event venue..."
                className={`${styles.input} ${
                  errors.venue ? styles.inputError : ""
                }`}
                // required
              />
              {errors.venue && (
                <span className={styles.errorText}>{errors.venue}</span>
              )}
            </div>

            {/* Mode and Price Row */}
            <div className={styles.row}>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Event Mode *</label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  className={styles.select}
                  // required
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Price (₹)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0"
                  className={`${styles.input} ${
                    errors.price ? styles.inputError : ""
                  }`}
                  min="0"
                  step="0.01"
                />
                {errors.price && (
                  <span className={styles.errorText}>{errors.price}</span>
                )}
              </div>
            </div>

            {/* Attendees and Contact Row */}
            <div className={styles.row}>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Maximum Attendees</label>
                <input
                  type="number"
                  name="max_attendees"
                  value={formData.max_attendees}
                  onChange={handleInputChange}
                  placeholder="Enter maximum attendees..."
                  className={`${styles.input} ${
                    errors.max_attendees ? styles.inputError : ""
                  }`}
                  min="1"
                />
                {errors.max_attendees && (
                  <span className={styles.errorText}>{errors.max_attendees}</span>
                )}
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.label}>Organiser Contact</label>
                <input
                  type="text"
                  name="organiser_contact"
                  value={formData.organiser_contact}
                  onChange={handleInputChange}
                  placeholder="Phone number or email..."
                  className={styles.input}
                />
              </div>
            </div>

            {/* Event Description Section */}
            <div className={styles.descriptionSection}>
              <h2 className={styles.sectionTitle}>Event Details</h2>

              {/* Poster Image */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  Event Poster Image {!isEditMode && "*"}
                </label>
                <div className={styles.fileInputWrapper}>
                  <input
                    type="file"
                    name="posterImage"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.fileInput}
                    id="poster-image"
                  />
                  <label htmlFor="poster-image" className={styles.fileInputLabel}>
                    <div
                      className={`${styles.uploadArea} ${
                        errors.posterImage ? styles.uploadAreaError : ""
                      }`}
                    >
                      {imagePreview ? (
                        <div className={styles.imagePreview}>
                          <img
                            src={imagePreview}
                            alt="Poster preview"
                            className={styles.previewImage}
                          />
                          <div className={styles.imageOverlay}>
                            <span>🖼️</span>
                            <span>
                              Click to {isEditMode ? "change" : "upload"} poster
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.uploadPlaceholder}>
                          <span>🖼️</span>
                          <span>Click to upload poster image</span>
                          {!isEditMode && <small>Required field</small>}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                {errors.posterImage && (
                  <span className={styles.errorText}>{errors.posterImage}</span>
                )}
              </div>

              {/* Description */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Event Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your event in detail..."
                  className={`${styles.textarea} ${
                    errors.description ? styles.inputError : ""
                  }`}
                  rows={6}
                  // required
                />
                {errors.description && (
                  <span className={styles.errorText}>{errors.description}</span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? (isEditMode ? "Updating..." : "Creating...") : isEditMode ? "Update Event" : "Create Event"}
              </button>

              {isEditMode && (
                <button
                  type="button"
                  className={`${styles.deleteButton} ${confirmingDelete ? styles.deleteButtonConfirm : ""}`}
                  onClick={handleDelete}
                  disabled={loading}
                  title={confirmingDelete ? "Click to permanently delete" : "Delete this event"}
                >
                  {confirmingDelete ? "Confirm Delete" : "Delete Event"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EventForm;
