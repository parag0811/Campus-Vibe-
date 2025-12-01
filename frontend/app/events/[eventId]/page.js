"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/common/toast";
import { useAuth } from "@/components/common/authContext";
import styles from "./EventDetail.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EventDetailPage = () => {
  const [event, setEvent] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [orgLogoLoaded, setOrgLogoLoaded] = useState(false);
  const [orgLogoBroken, setOrgLogoBroken] = useState(false);
  const [orgContactLogoLoaded, setOrgContactLogoLoaded] = useState(false);
  const [orgContactLogoBroken, setOrgContactLogoBroken] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { eventId } = useParams();
  const { user } = useAuth();

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/eventDetail/${eventId}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || `Failed to fetch event: ${response.status}`
          );
        }

        const ev = data.event || {};
        const org = data.organisation || null;

        setEvent(ev);
        setOrganisation(org);

        if (ev.attendees && user?._id) {
          setUserRegistered(
            ev.attendees.map(String).includes(String(user._id))
          );
        }
      } catch (err) {
        toast.error(err.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [eventId, toast, user?._id]);

  useEffect(() => {
    setHeroLoaded(false);
    if (!event?.posterUrl) {
      setHeroLoaded(true);
      return;
    }
    const img = new Image();
    img.src = event.posterUrl;
    img.onload = () => setHeroLoaded(true);
    img.onerror = () => setHeroLoaded(true);
    return () => { img.onload = null; img.onerror = null; };
  }, [event?.posterUrl]);

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
        setUserRegistered(true);
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

      if (
        orderResp.status === 403 &&
        orderData?.code === "PROFILE_INCOMPLETE"
      ) {
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
            const verifyResp = await fetch(
              `${API_BASE}/payment/verify-payment`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );
            const verifyData = await verifyResp.json();
            if (!verifyResp.ok || !verifyData?.success) {
              throw new Error(
                verifyData.message || "Payment verification failed"
              );
            }
            toast.success("Payment successful!");
            setUserRegistered(true);
            router.push(
              `/payment/success?bookingId=${encodeURIComponent(
                verifyData.bookingId
              )}&ticketId=${encodeURIComponent(
                verifyData.ticketId || ""
              )}&eventId=${encodeURIComponent(verifyData.eventId || eventId)}`
            );
          } catch (e) {
            toast.error(e.message || "Payment verification failed");
            router.push(
              `/payment/failed?eventId=${encodeURIComponent(eventId)}`
            );
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

  const isFree = () => Number(event?.price) === 0;

  // Optionally tighten registration window:
  const isRegistrationOpen = () => {
    if (!event) return false;
    const now = new Date();
    const deadline = new Date(event.registeration_deadline);
    const start = new Date(event.start_date);
    return now < deadline && now < start;
  };

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
      <div
        className={styles.heroBG}
        style={{
          backgroundImage: event.posterUrl ? `url(${event.posterUrl})` : "none",
        }}
      >
        {!heroLoaded && <div className={styles.heroSkeleton}></div>}
        <div className={styles.heroShade}></div>
        <div className={styles.heroBlur}></div>

        <div className={styles.heroWrapper}>
          {/* LEFT POSTER */}
          <div className={styles.posterBox}
            style={{
              backgroundImage: event.posterUrl ? `url(${event.posterUrl})` : "none",
            }}
          >
            {!heroLoaded && <div className={styles.posterBoxSkeleton}></div>}
          </div>

          {/* RIGHT SIDE */}
          <div className={styles.heroRightSide}>
            <h1 className={styles.heroTitleClean}>{event.title}</h1>

            <div className={styles.quickMeta}>
              <span>{formatDate(event.start_date)}</span>
              {event.end_date && <span>Ends: {formatDate(event.end_date)}</span>}
              <span>{event.mode?.[0]?.toUpperCase() + event.mode?.slice(1)}</span>
              <span>{event.venue}</span>
              <span>{isFree() ? "Free" : `₹${event.price}`}</span>
            </div>

            <div className={styles.orgStrip}>
              {organisation?.logoUrl && (
                <div style={{ position: "relative" }}>
                  {!orgLogoLoaded && <div className={styles.orgLogoSkeleton} />}
                  {!orgLogoBroken && (
                    <img
                      src={organisation.logoUrl}
                      alt="org"
                      style={{ opacity: orgLogoLoaded ? 1 : 0, transition: "opacity .2s ease" }}
                      onLoad={() => setOrgLogoLoaded(true)}
                      onError={() => { setOrgLogoBroken(true); setOrgLogoLoaded(true); }}
                    />
                  )}
                  {orgLogoBroken && (
                    <div className={styles.orgLogoFallback}>
                      {(organisation?.name || "O").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <span>{organisation?.name || "Organizer"}</span>
            </div>

            {/* REGISTER CARD (unchanged) */}
            <div className={styles.eventCard}>
              <div className={styles.dateTimeSection}>
                <h3 className={styles.sectionTitle}>Event Dates</h3>

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
                  <span style={{ fontWeight: 500 }}>Registration Deadline:</span>{" "}
                  {formatDate(event.registeration_deadline)}
                </p>
              </div>

              <button
                className={styles.bookNowBtn}
                onClick={handleRegistration}
                disabled={
                  userRegistered || !isRegistrationOpen() || isRegistering
                }
              >
                {userRegistered
                  ? "Already Registered"
                  : isRegistering
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
          </div>
        </div>
      </div>

      <section className={styles.contentSection}>
        <div className={styles.contentWrapper}>
          <div className={styles.leftContent}>
            <div className={styles.descriptionSection}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <div className={styles.descriptionText}>
                <p>{event.description}</p>
              </div>
            </div>
            <div className={styles.eventDetailsSection}>
              <h2 className={styles.sectionTitle}>Event Details</h2>
              <div className={styles.eventDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mode:</span>
                  <span className={styles.detailValue}>
                    {event.mode?.[0]?.toUpperCase() + event.mode?.slice(1)}
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
              {organisation || event.organiser_contact ? (
                <div className={styles.orgContactBlock}>
                  {organisation?.logoUrl && (
                    <div className={styles.orgContactLogo}>
                      {!orgContactLogoLoaded && <div className={styles.orgLogoSkeleton} />}
                      {!orgContactLogoBroken && (
                        <img
                          src={organisation.logoUrl}
                          alt={organisation?.name || "Organisation"}
                          style={{ opacity: orgContactLogoLoaded ? 1 : 0, transition: "opacity .2s ease" }}
                          onLoad={() => setOrgContactLogoLoaded(true)}
                          onError={() => { setOrgContactLogoBroken(true); setOrgContactLogoLoaded(true); }}
                        />
                      )}
                      {orgContactLogoBroken && (
                        <div className={styles.orgLogoFallback}>
                          {(organisation?.name || "O").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.orgContactInfo}>
                    <p className={styles.orgContactName}>
                      {organisation?.name || "Organisation"}
                    </p>
                    {organisation?.contact_email && (
                      <p className={styles.orgContactEmail}>
                        {organisation.contact_email}
                      </p>
                    )}
                    {event.organiser_contact && (
                      <p className={styles.orgContactPhone}>
                        {event.organiser_contact}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p>Contact details will be provided upon registration</p>
              )}
            </div>
          </div>
          <div className={styles.rightContent}></div>
        </div>
      </section>
    </div>
  );
};

export default EventDetailPage;
