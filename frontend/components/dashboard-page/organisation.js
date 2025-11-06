"use client";
import { useEffect, useState } from "react";
import styles from "./organisation.module.css";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const OrganisationPage = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.status === 401) {
          toast.info("Please login to manage your organisation.");
          return;
        }

        const data = await res.json();
        if (aborted) return;

        if (res.ok && data?.hasOrganisation && data.organisation) {
          setHasOrganisation(true);
          setFormData({
            title: data.organisation.name || "",
            description: data.organisation.description || "",
            email: data.organisation.contact_email || "",
          });
          if (data.imageUrl) setImagePreview(data.imageUrl);
        } else {
          setHasOrganisation(false);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load organisation");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, []); 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setValidationErrors((p) => ({ ...p, [name]: null }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    toast.success("Image selected");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    if (!hasOrganisation) {
      toast.info("Create an organisation first");
      return;
    }

    const form = new FormData();
    form.append("name", formData.title);
    form.append("description", formData.description);
    form.append("contact_email", formData.email);
    if (profileImage) form.append("image", profileImage);

    try {
      setSaving(true);
      const res = await fetch(
        `${API_BASE}/org/organisationAdmin/update-organisation-detail`,
        {
          method: "PUT",
          credentials: "include",
          body: form,
        }
      );
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Organisation updated");
      } else if (res.status === 422 && Array.isArray(data.data)) {
        const map = {};
        data.data.forEach((err) => {
          if (err.path && !map[err.path]) map[err.path] = err.msg;
        });
        setValidationErrors(map);
        toast.error(data.message || "Validation failed");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganisation = async () => {
    if (!hasOrganisation) return;
    if (!window.confirm("Delete your organisation? This cannot be undone."))
      return;

    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE}/org/organisationAdmin/delete-organisation`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Organisation deleted");
        setHasOrganisation(false);
        setFormData({ title: "", description: "", email: "" });
        setImagePreview(null);
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        {hasOrganisation ? "Update your Organisation" : "No Organisation yet"}
      </h1>

      {!hasOrganisation ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            You haven’t created an organisation yet. Create one to start managing
            events and admins.
          </p>
          <a
            href="/create-organisation"
            className={styles.emptyButton}
          >
            Create Organisation
          </a>
        </div>
      ) : (
        <div className={styles.formCard}>
          <div className={styles.formWrapper}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.imagePickerSection}>
                <div className={styles.imagePickerWrapper}>
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={styles.imageInput}
                  />
                  <label htmlFor="profileImage" className={styles.imageLabel}>
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Org logo"
                        className={styles.previewImage}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <span className={styles.uploadText}>Add Photo</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.label}>
                  Organisation Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                {validationErrors.name && (
                  <p className={styles.errorText}>{validationErrors.name}</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={4}
                />
                {validationErrors.description && (
                  <p className={styles.errorText}>
                    {validationErrors.description}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email ID
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                {validationErrors.contact_email && (
                  <p className={styles.errorText}>
                    {validationErrors.contact_email}
                  </p>
                )}
              </div>

              <button type="submit" className={styles.submitButton} disabled={saving}>
                {saving ? "Saving..." : "Update Organisation"}
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDeleteOrganisation}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Organisation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganisationPage;
