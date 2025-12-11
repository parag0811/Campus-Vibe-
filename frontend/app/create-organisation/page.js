"use client";

import { useEffect, useState } from "react";
import styles from "./onboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function CreateOrganisationOnboarding() {
  const [checking, setChecking] = useState(true);
  const [hasOrganisation, setHasOrganisation] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    contact_email: "",
    upiId: "",
    "kyc.fullName": "",
    "kyc.phoneNumber": "",
    // bank fields removed; only upiId is required for payouts
  });
  const [image, setImage] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentDownloadUrl, setDocumentDownloadUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, type: "info", text: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
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

  const normalizePath = (p) => {
    if (p === "payoutPreferences.upiId") return "upiId";
    if (p === "kyc.fullName") return "kyc.fullName";
    if (p === "kyc.phoneNumber") return "kyc.phoneNumber";
    return p;
  };

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
      showToast("error", "KYC document must be image (jpg/png/webp) or PDF.");
      return;
    }
    setDocumentFile(file);
    if (documentDownloadUrl) URL.revokeObjectURL(documentDownloadUrl);
    setDocumentDownloadUrl(URL.createObjectURL(file));
  };

  const validateFrontend = () => {
    const v = {};
    if (!form.name || form.name.trim().length < 6 || form.name.trim().length > 60) v.name = "Name must be 6-60 characters.";
    if (!form.description || form.description.trim().length < 6 || form.description.trim().length > 100) v.description = "Description must be 6-100 characters.";
    if (!form.contact_email || !/^\S+@\S+\.\S+$/.test(form.contact_email)) v.contact_email = "Enter a valid email.";
    if (!form["kyc.fullName"] || form["kyc.fullName"].trim().length < 2) v["kyc.fullName"] = "Full name is required.";
    if (!form["kyc.phoneNumber"] || !/^[0-9+\-\s]{6,15}$/.test(form["kyc.phoneNumber"])) v["kyc.phoneNumber"] = "Enter a valid phone number.";
    // UPI ID basic check (non-empty); keep validation light to accept different UPI formats
    if (!form.upiId || form.upiId.trim().length < 3) v.upiId = "Enter a valid UPI ID.";
    if (!image) v.image = "Organisation logo required.";
    if (!documentFile) v.document = "KYC document required.";
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
    fd.append("upiId", form.upiId.trim());
    fd.append("kyc.fullName", form["kyc.fullName"].trim());
    fd.append("kyc.phoneNumber", form["kyc.phoneNumber"].trim());
    fd.append("image", image);
    fd.append("document", documentFile);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/org/organisationAdmin/create-organisation`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data?.data)) {
          const map = {};
          data.data.forEach((e) => {
            const key = normalizePath(e.path);
            if (key && !map[key]) map[key] = e.msg;
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
            <p className={styles.subtitle}>Provide organisation UPI and KYC details to continue.</p>
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
              <label className={styles.label} htmlFor="upiId">UPI ID</label>
              <input
                id="upiId"
                name="upiId"
                className={`${styles.input} ${errors.upiId ? styles.inputError : ""}`}
                value={form.upiId}
                onChange={onChange}
                placeholder="example@bank"
              />
              {errors.upiId && <div className={styles.error}>{errors.upiId}</div>}
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

            {/* bank fields removed — only UPI is required */}

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
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={onDocChange}
                  className={styles.fileInputHidden}
                />
                <div className={styles.fileControl}>
                  <label htmlFor="document" className={styles.fileButton}>Choose Document</label>
                  <span className={styles.fileName}>{documentFile?.name || "No file chosen"}</span>
                </div>
                {documentDownloadUrl && (
                  <a
                    href={documentDownloadUrl}
                    download={documentFile?.name || "kyc-document"}
                    className={styles.downloadLink}
                  >
                    Download selected document
                  </a>
                )}
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