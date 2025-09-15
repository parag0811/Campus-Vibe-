"use client";
import styles from "./profile.module.css";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function validateProfile(formData) {
  const errors = {};

  // Name
  if (!formData.name.trim()) {
    errors.name = "Please enter a valid name.";
  } else if (formData.name.length > 16) {
    errors.name = "Name must be within 16 characters";
  }

  // Age
  if (!formData.age.trim()) {
    errors.age = "Please enter a valid age.";
  } else if (!/^\d+$/.test(formData.age)) {
    errors.age = "Age must be valid.";
  } else if (parseInt(formData.age) < 13) {
    errors.age = "Age must be at least 13.";
  } else if (parseInt(formData.age) > 99) {
    errors.age = "Age must be less than 100.";
  }

  // College Name
  if (!formData.college_name.trim()) {
    errors.college_name = "Please enter a valid college information.";
  } else if (formData.college_name.length > 60) {
    errors.college_name = "College must be within 60 characters";
  }

  // College ID
  if (!formData.college_id.trim()) {
    errors.college_id = "Please enter a valid college id.";
  } else if (formData.college_id.length > 24) {
    errors.college_id = "Id must be within 24 characters";
  }

  // Email (required for update route)
  if (!formData.email.trim()) {
    errors.email = "Please enter a valid email.";
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "Please enter a valid email.";
  }

  return errors;
}

const UserProfileForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    college_name: "",
    college_id: "",
  });
  const [role, setRole] = useState(""); // display only
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const response = await fetch(`${API_URL}/auth/update-user-profile`, {
        method: "GET",
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch user profile");
      }


      const user = json.data || {};
      setFormData({
        name: user.name || "",
        email: user.email || "",
        age: user.age?.toString() || "",
        college_name: user.college_name || "",
        college_id: user.college_id || "",
      });
      setRole(user.role || "");
    } catch (err) {
      setErrors({ general: err.message || "Could not load profile" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateProfile(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsUpdating(true);
    setErrors({});

    try {
      const submitData = {
        ...formData,
        age: formData.age, // keep as string for backend
      };
      // Debug log
      // console.log("Submitting profile data to backend:", submitData);

      const response = await fetch(`${API_URL}/auth/update-user-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitData),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        alert("Profile updated successfully!");
        setErrors({});
        fetchUserProfile();
      } else {
        // express-validator errors
        if (data.data && Array.isArray(data.data)) {
          const backendErrors = {};
          data.data.forEach((error) => {
            backendErrors[error.param] = error.msg;
          });
          setErrors(backendErrors);
        } else if (data.message) {
          setErrors({ general: data.message });
        } else {
          setErrors({ general: "Failed to update profile" });
        }
      }
    } catch (error) {
      setErrors({ general: "Failed to update profile. Please try again." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    fetchUserProfile();
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.subtitle}>
            Manage your name and account settings.
          </p>
        </div>

        

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name */}
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Full name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`${styles.input} ${
                errors.name ? styles.inputError : ""
              }`}
              placeholder="Enter your full name"
              autoComplete="off"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          {/* Email (editable, as backend allows change) */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${styles.input} ${
                errors.email ? styles.inputError : ""
              }`}
              placeholder="Enter your email"
              autoComplete="off"
            />
            {errors.email && (
              <span className={styles.error}>{errors.email}</span>
            )}
          </div>

          {/* Age */}
          <div className={styles.formGroup}>
            <label htmlFor="age" className={styles.label}>
              Age
            </label>
            <input
              type="text"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className={`${styles.input} ${
                errors.age ? styles.inputError : ""
              }`}
              placeholder="Enter your age"
              autoComplete="off"
            />
            {errors.age && <span className={styles.error}>{errors.age}</span>}
          </div>

          {/* College Name */}
          <div className={styles.formGroup}>
            <label htmlFor="college_name" className={styles.label}>
              College Name
            </label>
            <input
              type="text"
              id="college_name"
              name="college_name"
              value={formData.college_name}
              onChange={handleChange}
              className={`${styles.input} ${
                errors.college_name ? styles.inputError : ""
              }`}
              placeholder="Enter your college name"
              autoComplete="off"
            />
            {errors.college_name && (
              <span className={styles.error}>{errors.college_name}</span>
            )}
          </div>

          {/* College ID */}
          <div className={styles.formGroup}>
            <label htmlFor="college_id" className={styles.label}>
              College ID
            </label>
            <input
              type="text"
              id="college_id"
              name="college_id"
              value={formData.college_id}
              onChange={handleChange}
              className={`${styles.input} ${
                errors.college_id ? styles.inputError : ""
              }`}
              placeholder="Enter your college ID"
              autoComplete="off"
            />
            {errors.college_id && (
              <span className={styles.error}>{errors.college_id}</span>
            )}
          </div>

          {/* Role (display only) */}
          {role && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Role</label>
              <input
                type="text"
                value={role}
                disabled
                className={styles.input}
                style={{ background: "#f2f2f2" }}
              />
            </div>
          )}

          {errors.general && (
          <div className={styles.generalError}>{errors.general}</div>
        )}

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelBtn}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className={`${styles.saveBtn} ${
                isUpdating ? styles.saveBtnLoading : ""
              }`}
            >
              {isUpdating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileForm;
