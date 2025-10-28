"use client";

import { useEffect, useState } from "react";
import styles from "./onboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CreateOrganisationOnboarding() {
  const [checking, setChecking] = useState(true);
  const [hasOrganisation, setHasOrganisation] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    contact_email: "",
    "kyc.fullName": "",
    "kyc.phoneNumber": "",
    razorpayAccountId: "",
  });
  const [image, setImage] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, type: "info", text: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/organisationAdmin/my-organisation`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data?.hasOrganisation) {
          setHasOrganisation(true);
          setToast({
            show: true,
            type: "info",
            text: "You already have an organisation. Redirecting to update...",
          });
          setTimeout(() => {
            window.location.href = "/admin/organisation";
          }, 1000);
          return;
        }
      } catch (_) {}
      setChecking(false);
    })();
  }, []);

  const showToast = (type, text) => setToast({ show: true, type, text });
  const clearToast = () => setToast({ show: false, type: "info", text: "" });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: null }));
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Logo must be an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Logo size should be less than 5MB.");
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const onDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      showToast("error", "KYC document must be an image or PDF.");
      return;
    }
    setDocumentFile(file);
  };

  const validateFrontend = () => {
    const v = {};
    if (!form.name || form.name.trim().length < 6) v.name = "Name must be 6-60 characters.";
    if (!form.description || form.description.trim().length < 6) v.description = "Description must be 6-100 characters.";
    if (!form.contact_email || !/^\S+@\S+\.\S+$/.test(form.contact_email)) v.contact_email = "Enter a valid email.";
    if (!form["kyc.fullName"] || form["kyc.fullName"].trim().length < 2) v["kyc.fullName"] = "Full name is required.";
    if (!form["kyc.phoneNumber"] || !/^[0-9+\-\s]{6,15}$/.test(form["kyc.phoneNumber"])) v["kyc.phoneNumber"] = "Enter a valid phone number.";
    if (!form.razorpayAccountId || !/^acc_[A-Za-z0-9]+$/.test(form.razorpayAccountId)) v.razorpayAccountId = "Enter a valid Razorpay Account ID (acc_...).";
    if (!image) v.image = "Organisation logo is required.";
    if (!documentFile) v.document = "KYC document is required.";
    return v;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    clearToast();
    setErrors({});
    const frontErrs = validateFrontend();
    if (Object.keys(frontErrs).length) {
      setErrors(frontErrs);
      showToast("error", "Please fix the highlighted fields.");
      return;
    }

    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("description", form.description.trim());
    fd.append("contact_email", form.contact_email.trim().toLowerCase());
    fd.append("razorpayAccountId", form.razorpayAccountId.trim());
    fd.append("kyc.fullName", form["kyc.fullName"].trim());
    fd.append("kyc.phoneNumber", form["kyc.phoneNumber"].trim());
    fd.append("image", image);
    fd.append("document", documentFile);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/organisationAdmin/create-organisation`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data?.data)) {
          const map = {};
          data.data.forEach((e) => {
            if (e.path && !map[e.path]) map[e.path] = e.msg;
          });
          setErrors(map);
        }
        showToast("error", data?.message || "Failed to create organisation.");
        if (res.status === 401) {
          setTimeout(() => (window.location.href = "/login"), 800);
        }
        return;
      }
      showToast("success", data?.message || "Organisation created successfully.");
      setTimeout(() => (window.location.href = "/admin/organisation"), 900);
    } catch (_) {
      showToast("error", "Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || hasOrganisation) {
    return (
      <div className={styles.shell}>
        <main className={styles.centerBox}>
          <div className={styles.loader}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <section className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Organisation Onboarding</h1>
            <p className={styles.subtitle}>Provide organisation and KYC details to continue.</p>
          </div>

          {toast.show && (
            <div
              className={
                toast.type === "error"
                  ? styles.msgError
                  : toast.type === "success"
                  ? styles.msgSuccess
                  : styles.msgInfo
              }
              onAnimationEnd={() => setTimeout(clearToast, 3500)}
            >
              {toast.text}
            </div>
          )}

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="name">Organisation Name</label>
                <input
                  id="name"
                  name="name"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                  value={form.name}
                  onChange={onChange}
                  placeholder="e.g., Tech Society"
                />
                {errors.name && <div className={styles.error}>{errors.name}</div>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="contact_email">Contact Email</label>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  className={`${styles.input} ${errors.contact_email ? styles.inputError : ""}`}
                  value={form.contact_email}
                  onChange={onChange}
                  placeholder="org@example.com"
                />
                {errors.contact_email && <div className={styles.error}>{errors.contact_email}</div>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
                value={form.description}
                onChange={onChange}
                placeholder="Tell attendees about your organisation..."
              />
              {errors.description && <div className={styles.error}>{errors.description}</div>}
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="kycFullName">KYC Full Name</label>
                <input
                  id="kycFullName"
                  name="kyc.fullName"
                  className={`${styles.input} ${errors["kyc.fullName"] ? styles.inputError : ""}`}
                  value={form["kyc.fullName"]}
                  onChange={onChange}
                  placeholder="As per ID document"
                />
                {errors["kyc.fullName"] && <div className={styles.error}>{errors["kyc.fullName"]}</div>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="kycPhone">KYC Phone Number</label>
                <input
                  id="kycPhone"
                  name="kyc.phoneNumber"
                  className={`${styles.input} ${errors["kyc.phoneNumber"] ? styles.inputError : ""}`}
                  value={form["kyc.phoneNumber"]}
                  onChange={onChange}
                  placeholder="+91 98765 43210"
                />
                {errors["kyc.phoneNumber"] && <div className={styles.error}>{errors["kyc.phoneNumber"]}</div>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="razorpayAccountId">Razorpay Account ID</label>
              <input
                id="razorpayAccountId"
                name="razorpayAccountId"
                className={`${styles.input} ${errors.razorpayAccountId ? styles.inputError : ""}`}
                value={form.razorpayAccountId}
                onChange={onChange}
                placeholder="acc_XXXXXXXXXXXX"
              />
              {errors.razorpayAccountId && <div className={styles.error}>{errors.razorpayAccountId}</div>}
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="image">Organisation Logo</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className={styles.fileInputHidden}
                />
                <div className={styles.fileControl}>
                  <label htmlFor="image" className={styles.fileButton}>Choose Logo</label>
                  <span className={styles.fileName}>{image?.name || "No file chosen"}</span>
                </div>
                {imagePreview && <img src={imagePreview} alt="Preview" className={styles.preview} />}
                {errors.image && <div className={styles.error}>{errors.image}</div>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="document">KYC Document (Image/PDF)</label>
                <input
                  id="document"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onDocChange}
                  className={styles.fileInputHidden}
                />
                <div className={styles.fileControl}>
                  <label htmlFor="document" className={styles.fileButton}>Choose Document</label>
                  <span className={styles.fileName}>{documentFile?.name || "No file chosen"}</span>
                </div>
                {errors.document && <div className={styles.error}>{errors.document}</div>}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? "Creating..." : "Create Organisation"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}