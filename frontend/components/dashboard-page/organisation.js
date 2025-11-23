"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./organisation.module.css";
import { useToast } from "@/components/common/toast";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const OrganisationPage = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contact_email: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankAddress: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [kycDoc, setKycDoc] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const imageInputRef = useRef(null);
  const kycInputRef = useRef(null);

  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrorSummary, setFormErrorSummary] = useState("");

  const fieldRules = {
    name: (v) =>
      !v.trim()
        ? "Name required."
        : v.trim().length < 6
        ? "Name must be ≥ 6 chars."
        : v.trim().length > 60
        ? "Name must be ≤ 60 chars."
        : null,
    description: (v) =>
      !v.trim()
        ? "Description required."
        : v.trim().length < 6
        ? "Description must be ≥ 6 chars."
        : v.trim().length > 100
        ? "Description must be ≤ 100 chars."
        : null,
    contact_email: (v) =>
      !v.trim()
        ? "Email required."
        : !/^\S+@\S+\.\S+$/.test(v.trim())
        ? "Enter valid email."
        : null,
    bankAccountName: (v) =>
      !v.trim()
        ? "Account name required."
        : v.trim().length < 2
        ? "Min 2 chars."
        : v.trim().length > 80
        ? "Max 80 chars."
        : null,
    bankAccountNumber: (v) =>
      !v.trim()
        ? "Account number required."
        : !/^[0-9A-Z]{6,34}$/.test(v.trim())
        ? "Invalid account number."
        : null,
    bankIfsc: (v) =>
      !v.trim()
        ? "IFSC required."
        : !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase())
        ? "Invalid IFSC."
        : null,
    bankAddress: (v) =>
      !v.trim()
        ? "Bank address required."
        : v.trim().length < 4
        ? "Min 4 chars."
        : v.trim().length > 120
        ? "Max 120 chars."
        : null,
  };

  const validateClient = () => {
    const errs = {};
    Object.entries(fieldRules).forEach(([field, ruleFn]) => {
      const msg = ruleFn(formData[field] || "");
      if (msg) errs[field] = msg;
    });
    return errs;
  };

  useEffect(() => {
    if (!API_BASE) {
      toast.error("API base not configured.");
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
          signal: ac.signal,
        });
        if (res.status === 401) {
          toast.info("Login required.");
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!res.ok || !data?.hasOrganisation || !data.organisation) {
          setHasOrganisation(false);
          return;
        }
        setHasOrganisation(true);
        setFormData({
          name: data.organisation.name || "",
            description: data.organisation.description || "",
            contact_email: data.organisation.contact_email || "",
            bankAccountName: data.organisation.bank?.accountName || "",
            bankAccountNumber: data.organisation.bank?.accountNumber || "",
            bankIfsc: data.organisation.bank?.ifsc || "",
            bankAddress: data.organisation.bank?.address || "",
        });
        if (data.imageUrl) setImagePreview(data.imageUrl);
      } catch (e) {
        if (e.name !== "AbortError") toast.error("Failed to load organisation.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [toast, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    // live per-field validation
    if (fieldRules[name]) {
      const msg = fieldRules[name](value);
      setValidationErrors((prev) => ({ ...prev, [name]: msg }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Invalid image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be <5MB.");
      return;
    }
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleKycChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("KYC must be image/PDF.");
      return;
    }
    setKycDoc(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setFormErrorSummary("");
    // Client-side check first
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setValidationErrors(clientErrs);
      setFormErrorSummary("Fix highlighted fields before submitting.");
      return;
    }
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("contact_email", formData.contact_email);
    if (formData.bankAccountName) fd.append("bank.accountName", formData.bankAccountName);
    if (formData.bankAccountNumber) fd.append("bank.accountNumber", formData.bankAccountNumber);
    if (formData.bankIfsc) fd.append("bank.ifsc", formData.bankIfsc.toUpperCase());
    if (formData.bankAddress) fd.append("bank.address", formData.bankAddress);
    if (profileImage) fd.append("image", profileImage);
    if (kycDoc) fd.append("document", kycDoc);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/org/organisationAdmin/update-organisation-detail`, {
        method: "PUT",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (res.status === 401) {
        toast.info("Login required.");
        router.replace("/login");
        return;
      }
      if (res.ok) {
        toast.success(data.message || "Updated.");
      } else if (res.status === 422 && Array.isArray(data.data)) {
        const map = {};
        data.data.forEach((err) => {
            if (err.path) {
              // map backend dot paths to our field names
              const key =
                err.path === "bank.accountName"
                  ? "bankAccountName"
                  : err.path === "bank.accountNumber"
                  ? "bankAccountNumber"
                  : err.path === "bank.ifsc"
                  ? "bankIfsc"
                  : err.path === "bank.address"
                  ? "bankAddress"
                  : err.path;
              if (!map[key]) map[key] = err.msg;
            }
        });
        setValidationErrors(map);
        setFormErrorSummary("Validation failed on server.");
        toast.error("Validation failed.");
      } else {
        const msg = data.message || "Update failed.";
        setFormErrorSummary(msg);
        toast.error(msg);
      }
    } catch {
      setFormErrorSummary("Network error.");
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganisation = async () => {
    if (!hasOrganisation || deleting) return;
    if (!API_BASE) return;
    if (!window.confirm("Delete organisation permanently?")) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/org/organisationAdmin/delete-organisation`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Deleted.");
        setHasOrganisation(false);
        setFormData({
          name: "",
          description: "",
          contact_email: "",
          bankAccountName: "",
          bankAccountNumber: "",
          bankIfsc: "",
          bankAddress: "",
        });
        setImagePreview(null);
      } else {
        toast.error(data.message || "Delete failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasOrganisation) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>No Organisation</h1>
        <p>You need to create an organisation to manage its details.</p>
        <a href="/create-organisation" className={styles.submitButton}>
          Create Organisation
        </a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Update Organisation</h1>
      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.imageInput}
          />
          <div className={styles.imageControls}>
            <button
              type="button"
              className={`${styles.btnTiny} ${styles.btnTinyNeutral}`}
              onClick={() => imageInputRef.current?.click()}
            >
              Change Logo
            </button>
          </div>
          <div className={styles.imagePickerSection}>
            <div className={styles.imagePickerWrapper}>
              <div className={styles.imageLabel}>
                {imagePreview && (
                  <img src={imagePreview} alt="Logo" className={styles.previewImage} />
                )}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Organisation Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.name ? 'error' : ''}`}
              required
            />
            {validationErrors.name && <p className={styles.errorText}>{validationErrors.name}</p>}
          </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`${styles.textarea} ${validationErrors.description ? 'error' : ''}`}
                rows={4}
                required
              />
              {validationErrors.description && <p className={styles.errorText}>{validationErrors.description}</p>}
            </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Contact Email</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.contact_email ? 'error' : ''}`}
              required
            />
            {validationErrors.contact_email && <p className={styles.errorText}>{validationErrors.contact_email}</p>}
          </div>

          <h3 className={styles.sectionTitle}>Bank Details</h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>Account Name</label>
            <input
              name="bankAccountName"
              value={formData.bankAccountName}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.bankAccountName ? 'error' : ''}`}
              required
            />
            {validationErrors.bankAccountName && <p className={styles.errorText}>{validationErrors.bankAccountName}</p>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Account Number</label>
            <input
              name="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.bankAccountNumber ? 'error' : ''}`}
              required
            />
            {validationErrors.bankAccountNumber && <p className={styles.errorText}>{validationErrors.bankAccountNumber}</p>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>IFSC</label>
            <input
              name="bankIfsc"
              value={formData.bankIfsc}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.bankIfsc ? 'error' : ''}`}
              required
            />
            {validationErrors.bankIfsc && <p className={styles.errorText}>{validationErrors.bankIfsc}</p>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Bank Address</label>
            <input
              name="bankAddress"
              value={formData.bankAddress}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.bankAddress ? 'error' : ''}`}
              required
            />
            {validationErrors.bankAddress && <p className={styles.errorText}>{validationErrors.bankAddress}</p>}
          </div>

          <h3 className={styles.sectionTitle}>KYC Document</h3>
          <input
            ref={kycInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleKycChange}
            className={styles.fileInputHidden}
          />
          <div className={styles.fileRow}>
            <button
              type="button"
              className={`${styles.btnTiny} ${styles.btnTinyPrimary}`}
              onClick={() => kycInputRef.current?.click()}
            >
              Upload KYC
            </button>
            <span className={styles.fileName}>{kycDoc?.name || "No file selected"}</span>
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDeleteOrganisation}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button type="submit" className={styles.submitButton} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        {formErrorSummary && (
          <div className={styles.errorSummary} role="alert">
            {formErrorSummary}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganisationPage;
