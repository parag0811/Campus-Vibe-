"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./event-form.module.css";
import { getOrg } from "@/lib/api.js"; // Only keep getOrg if you want

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventForm = () => {
  const [allowed, setAllowed] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const editEventId = searchParams.get("edit");
    if (editEventId) {
      setIsEditMode(true);
      setEventId(editEventId);
    }

    async function checkOrganisation() {
      try {
        const data = await getOrg();
        if (!data.hasOrganisation) {
          alert("You need to create an organisation before adding events.");
          router.push("/admin/organisation");
        } else {
          setOrgId(data.organisationId);
          setAllowed(true);
          if (editEventId) {
            await fetchEventData(editEventId, data.organisationId);
          }
        }
      } catch (error) {
        setSubmitError("Failed to verify organisation access");
      }
    }

    checkOrganisation();
  }, [searchParams, router]);

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

  const fetchEventData = async (eventId, organisationId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/organisation/${organisationId}/event/${eventId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load event data");
      const eventData = await res.json();

      const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split("T")[0];
      };

      setFormData({
        title: eventData.title || "",
        description: eventData.description || "",
        registeration_deadline: formatDate(eventData.registeration_deadline),
        start_date: formatDate(eventData.start_date),
        end_date: formatDate(eventData.end_date),
        venue: eventData.venue || "",
        mode: eventData.mode || "offline",
        price: eventData.price ? eventData.price.toString() : "",
        max_attendees: eventData.max_attendees
          ? eventData.max_attendees.toString()
          : "",
        organiser_contact: eventData.organiser_contact || "",
        posterImage: null,
      });

      if (eventData.imageUrl) {
        setImagePreview(eventData.imageUrl);
      }
    } catch (error) {
      setSubmitError("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          posterImage: "Only .jpg, .png, or .webp images are allowed.",
        }));
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          posterImage: "Image size should be less than 5MB.",
        }));
        return;
      }
      setFormData((prev) => ({
        ...prev,
        posterImage: file,
      }));
      setErrors((prev) => ({
        ...prev,
        posterImage: "",
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setErrors({});
    if (!orgId || !allowed) {
      setSubmitError(
        "Organisation access not verified. Please refresh the page."
      );
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
      }).forEach(([key, val]) => formDataToSend.append(key, val));

      if (formData.posterImage) {
        formDataToSend.append("image", formData.posterImage);
      }

      const endpoint = isEditMode
        ? `${API_BASE}/organisation/${orgId}/edit-existing-event/${eventId}`
        : `${API_BASE}/organisation/${orgId}/register-new-event`;

      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        credentials: "include",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result?.data && Array.isArray(result.data)) {
          const backendErrors = {};
          result.data.forEach((err) => {
            if (err.type === "field" && err.path) {
              backendErrors[err.path] = err.msg;
            }
          });
          setErrors(backendErrors);
          setSubmitError("Please fix the highlighted fields.");
        } else {
          setSubmitError(result.message || "Something went wrong!");
        }
        return;
      }

      alert(result.message);
      router.push("/admin/events");
    } catch (error) {
      setSubmitError(error.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !eventId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/organisation/${orgId}/delete-event/${eventId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete event.");
      }

      alert("Event deleted successfully.");
      router.push("/admin/events");
    } catch (err) {
      setSubmitError(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return <p>Checking access...</p>;

  if (loading && isEditMode && !formData.title) {
    return <p>Loading event data...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>
          {isEditMode ? "Edit Event" : "Create Event"}
        </h1>

        {submitError && <div className={styles.errorAlert}>{submitError}</div>}

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
              className={`${styles.input} ${
                errors.title ? styles.inputError : ""
              }`}
              // required
            />
            {errors.title && (
              <span className={styles.errorText}>{errors.title}</span>
            )}
          </div>

          {/* Date Row */}
          <div className={styles.row}>
            <div className={styles.inputGroupHalf}>
              <label className={styles.label}>Registration Deadline *</label>
              <input
                type="date"
                name="registeration_deadline"
                value={formData.registeration_deadline}
                onChange={handleInputChange}
                className={`${styles.input} ${
                  errors.registeration_deadline ? styles.inputError : ""
                }`}
                // required
              />
              {errors.registeration_deadline && (
                <span className={styles.errorText}>
                  {errors.registeration_deadline}
                </span>
              )}
            </div>
            <div className={styles.inputGroupHalf}>
              <label className={styles.label}>Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className={`${styles.input} ${
                  errors.start_date ? styles.inputError : ""
                }`}
                // required
              />
              {errors.start_date && (
                <span className={styles.errorText}>{errors.start_date}</span>
              )}
            </div>
            <div className={styles.inputGroupHalf}>
              <label className={styles.label}>End Date *</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className={`${styles.input} ${
                  errors.end_date ? styles.inputError : ""
                }`}
                // required
              />
              {errors.end_date && (
                <span className={styles.errorText}>{errors.end_date}</span>
              )}
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
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Event"
                : "Create Event"}
            </button>

            {isEditMode && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDelete}
                disabled={loading}
              >
                Delete Event
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
