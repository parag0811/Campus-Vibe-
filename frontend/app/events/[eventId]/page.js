"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/common/toast";
import styles from "./EventDetail.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventDetailPage = () => {
  const [event, setEvent] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { eventId } = useParams();

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/eventDetail/${eventId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || `Failed to fetch event: ${response.status}`
          );
        }

        const ev = data.event || {};
        const posterUrl =
          ev.imageUrl ||
          (ev.posterImage && /^https?:\/\//i.test(ev.posterImage)
            ? ev.posterImage
            : null);

        const org = ev.organisation || ev.created_by_organisation || null;
        let orgLogoUrl = org?.logoUrl || null;
        const rawKey = org?.image || ev?.created_by_organisation?.image || null;

        if (!orgLogoUrl && rawKey && /^https?:\/\//i.test(rawKey)) {
          orgLogoUrl = rawKey;
        }

        setEvent({ ...ev, posterUrl });
        setOrganisation(org ? { ...org, logoUrl: orgLogoUrl } : null);
      } catch (err) {
        toast.error(
          err.message || "Something went wrong while fetching event details"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [eventId, toast]);

  const handleRegistration = async () => {
    if (!eventId) return;
    try {
      setIsRegistering(true);

      if (isFree()) {
        const resp = await fetch(`${API_BASE}/eventRegistration/${eventId}`, {
          method: "POST",
          credentials: "include",
        });
        const data = await resp.json();

        if (resp.status === 403 && data?.code === "PROFILE_INCOMPLETE") {
          toast.error("Please complete your profile to register for events.");
          router.push("/profile");
          return;
        }

        if (!resp.ok) throw new Error(data.message || "Registration failed");
        toast.success(data.message || "Registration successful!");
        return;
      }

      // Paid event → create order
      const orderResp = await fetch(`${API_BASE}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const orderData = await orderResp.json();

      if (orderResp.status === 403 && orderData?.code === "PROFILE_INCOMPLETE") {
        toast.error("Please complete your profile to register for events.");
        router.push("/profile");
        return;
      }

      if (!orderResp.ok || !orderData?.success) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      await loadRazorpayScript();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: organisation?.name || "CampusVibe",
        description: event?.title || "Event registration",
        order_id: orderData.orderId,
        theme: { color: "#7c3aed" },
        handler: async function (response) {
          try {
            const verifyResp = await fetch(`${API_BASE}/payment/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyResp.json();
            if (!verifyResp.ok || !verifyData?.success) {
              throw new Error(verifyData.message || "Payment verification failed");
            }
            toast.success("Payment successful!");
            router.push(
              `/payment/success?bookingId=${encodeURIComponent(
                verifyData.bookingId
              )}&ticketId=${encodeURIComponent(verifyData.ticketId || "")}&eventId=${encodeURIComponent(
                verifyData.eventId || eventId
              )}`
            );
          } catch (e) {
            toast.error(e.message || "Payment verification failed");
            router.push(`/payment/failed?eventId=${encodeURIComponent(eventId)}`);
          }
        },
        modal: { ondismiss: () => toast.error("Payment cancelled.") },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  async function loadRazorpayScript() {
    if (window.Razorpay) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(script);
    });
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isRegistrationOpen = () => {
    if (!event) return false;
    const now = new Date();
    const deadline = new Date(event.registeration_deadline);
    return now < deadline;
  };
  const isFree = () => event?.price === 0;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => router.back()} className={styles.retryBtn}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section
        className={styles.heroSection}
        style={{
          backgroundImage: event.posterUrl ? `url(${event.posterUrl})` : "none",
        }}
      />

      {/* Content Section */}
      <section className={styles.contentSection}>
        <div className={styles.contentWrapper}>
          <div className={styles.leftContent}>
            <div className={styles.titleRow}>
              <button
                className={styles.backBtnPurple}
                onClick={() => router.back()}
              >
                ← Back
              </button>
            </div>
            <h1 className={styles.headerTitle}>{event.title}</h1>
            <div className={styles.organiserCard + " " + styles.orgSection}>
              <div className={styles.orgAvatar}>
                {organisation?.logoUrl ? (
                  <img
                    src={organisation.logoUrl}
                    alt={organisation?.name || "Organisation"}
                  />
                ) : (
                  <div className={styles.orgAvatarFallback}>
                    {organisation?.name?.[0] || "O"}
                  </div>
                )}
              </div>
              <div className={styles.orgMeta}>
                <div className={styles.orgName}>
                  {organisation?.name || "Event Organizer"}
                </div>
                {organisation?.contact_email && (
                  <div className={styles.orgEmail}>
                    {organisation.contact_email}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.descriptionSection}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <div className={styles.descriptionText}>
                <p>{event.description}</p>
              </div>
            </div>

            {/* Event details */}
            <div className={styles.eventDetailsSection}>
              <h2 className={styles.sectionTitle}>Event Details</h2>
              <div className={styles.eventDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mode:</span>
                  <span className={styles.detailValue}>
                    {event.mode?.charAt(0).toUpperCase() +
                      (event.mode?.slice(1) || "")}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Venue:</span>
                  <span className={styles.detailValue}>{event.venue}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Price:</span>
                  <span className={styles.detailValue}>
                    {isFree() ? "Free" : `₹${event.price}`}
                  </span>
                </div>
                {event.max_attendees && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Max Attendees:</span>
                    <span className={styles.detailValue}>
                      {event.max_attendees}
                    </span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Current Attendees:</span>
                  <span className={styles.detailValue}>
                    {event.attendees?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.contactSection}>
              <h2 className={styles.sectionTitle}>Organizer Contact</h2>
              <p>
                {event.organiser_contact
                  ? `Contact: ${event.organiser_contact}`
                  : "Contact details will be provided upon registration"}
              </p>
            </div>
          </div>

          {/* Right side unchanged */}
          <div className={styles.rightContent}>
            <div className={styles.eventCard}>
              <div className={styles.dateTimeSection}>
                <h3 className={styles.sectionTitle}>Event Dates :</h3>
                <p className={styles.eventDate}>
                  <strong>
                    {event.start_date && event.end_date
                      ? `${formatDate(event.start_date)} to ${formatDate(
                          event.end_date
                        )}`
                      : formatDate(event.start_date)}
                  </strong>
                </p>
                <p className={styles.regDeadline}>
                  <span style={{ fontWeight: 500 }}>
                    Registration Deadline:
                  </span>{" "}
                  {formatDate(event.registeration_deadline)}
                </p>
              </div>
              <button
                className={styles.bookNowBtn}
                onClick={handleRegistration}
                disabled={!isRegistrationOpen() || isRegistering}
              >
                {isRegistering
                  ? "Registering..."
                  : !isRegistrationOpen()
                  ? "Registration Closed"
                  : isFree()
                  ? "Register Now"
                  : `Register - ₹${event.price}`}
              </button>
              <div className={styles.registrationInfo}>
                {event.max_attendees && (
                  <p className={styles.availability}>
                    {event.max_attendees - (event.attendees?.length || 0)} spots
                    remaining
                  </p>
                )}
              </div>
            </div>

            <div className={styles.shareSection}>
              <h3 className={styles.sectionTitle}>Share with friends</h3>
              <div className={styles.socialButtons}>
                <button className={styles.socialBtn + " " + styles.facebook}>
                  f
                </button>
                <button className={styles.socialBtn + " " + styles.whatsapp}>
                  W
                </button>
                <button className={styles.socialBtn + " " + styles.linkedin}>
                  in
                </button>
                <button className={styles.socialBtn + " " + styles.twitter}>
                  t
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventDetailPage;