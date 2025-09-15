"use client";
import { useEffect, useState } from "react";
import styles from "./organisation.module.css";
import { getOrg } from "@/lib/api";
import Alert from "@/components/alert/alert.js";


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CreateClub = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [validationErrors, setValidationErrors] = useState({});

  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });


  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getOrg();
        setHasOrganisation(data.hasOrganisation);
        setOrgData(data.organisation);

        if (data.organisation) {
          setFormData({
            title: data.organisation.name || "",
            description: data.organisation.description || "",
            email: data.organisation.contact_email || "",
          });

          if (data.imageUrl) {
            setImagePreview(data.imageUrl);
          }

          showAlert("success", "Organisation data loaded successfully!");
        }
      } catch (err) {
        console.log(err);
        showAlert("error", "Failed to load organisation data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert({ show: false, type: "info", message: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert("error", "Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showAlert("error", "Please select a valid image file");
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      showAlert("success", "Image selected successfully!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const form = new FormData();
    form.append("name", formData.title);
    form.append("description", formData.description);
    form.append("contact_email", formData.email);
    if (profileImage) form.append("image", profileImage);

    try {
      showAlert("info", "Processing your request...");

      const endpoint = hasOrganisation
        ? "http://localhost:5000/organisationAdmin/update-organisation-detail"
        : "http://localhost:5000/organisationAdmin/create-organisation";

      const method = hasOrganisation ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        showAlert("success", data.message || "Organisation saved!");
        if (!hasOrganisation) {
          setHasOrganisation(true);
        }
        if (!profileImage && imagePreview) {
          setImagePreview(imagePreview);
        }
      } else {
        if (Array.isArray(data.data)) {
          const errorMap = {};
          data.data.forEach((err) => {
            if (!errorMap[err.path]) {
              errorMap[err.path] = err.msg;
            }
          });
          setValidationErrors(errorMap);
        } else {
          showAlert("error", data.message || "Something went wrong.");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      showAlert("error", "Network error. Please try again.");
    }
  };

  const [deleting, setDeleting] = useState(false);

  // Delete functionality function 
  const handleDeleteOrganisation = async () => {
    if (!window.confirm("Are you sure you want to delete your organisation? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/organisationAdmin/delete-organisation`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", data.message || "Organisation deleted successfully.");
        setHasOrganisation(false);
        setOrgData(null);
        setFormData({ title: "", description: "", email: "" });
        setImagePreview(null);
      } else {
        showAlert("error", data.message || "Failed to delete organisation.");
      }
    } catch (err) {
      showAlert("error", "Network error. Please try again.");
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
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
          autoClose={true}
          duration={4000}
        />
      )}

      <h1 className={styles.title}>
        {hasOrganisation
          ? "Update your Organisation!"
          : "Create your Organisation!"}
      </h1>

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
                      alt="Profile preview"
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

            <button type="submit" className={styles.submitButton}>
              {hasOrganisation ? "Update Organisation" : "Create Organisation"}
            </button>
            {hasOrganisation && (
            <button
              className={styles.deleteButton}
              onClick={handleDeleteOrganisation}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Organisation"}
            </button>
          )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClub;
