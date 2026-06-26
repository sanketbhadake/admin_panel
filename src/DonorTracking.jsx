import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase/firebase";

const DonorTracking = () => {
  const { donationId } = useParams();
  const [donation, setDonation] = useState(null);
  const [volunteer, setVolunteer] = useState(null);

  useEffect(() => {
    if (!donationId) return;

    const unsub = onSnapshot(doc(db, "donations", donationId), (snap) => {
      const data = snap.data();
      setDonation(data ? { id: snap.id, ...data } : null);
      if (data?.assignedVolunteerId) {
        const volunteerRef = doc(db, "volunteers", data.assignedVolunteerId);
        onSnapshot(volunteerRef, (volSnap) => {
          setVolunteer(volSnap.exists() ? volSnap.data() : null);
        });
      }
    });

    return () => unsub();
  }, [donationId]);

  if (!donation) {
    return <div style={styles.container}>Loading donation tracking...</div>;
  }

  const statusSteps = [
    "Requested",
    "Approved",
    "Volunteer Assigned",
    "Picked Up",
    "Delivered",
  ];
  const currentIndex = [
    "pending",
    "approved",
    "assigned",
    "picked",
    "delivery_uploaded",
    "delivered",
  ].indexOf(donation.status);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Donor Transparency</p>
            <h2 style={styles.title}>Your donation is on its way</h2>
          </div>
          <div style={styles.badge}>Status: {donation.status}</div>
        </div>

        <div style={styles.successBox}>
          <strong>
            Your donation has successfully reached the orphanage. Thank you for
            supporting children in need.
          </strong>
        </div>

        <div style={styles.grid}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Donation Details</h3>
            <p>
              <strong>Donor:</strong> {donation.donorName || "Anonymous"}
            </p>
            <p>
              <strong>Category:</strong> {donation.category || "Item Donation"}
            </p>
            <p>
              <strong>Description:</strong> {donation.itemDescription || "—"}
            </p>
            <p>
              <strong>Volunteer:</strong>{" "}
              {volunteer?.name ||
                donation.assignedVolunteerName ||
                "Awaiting assignment"}
            </p>
            <p>
              <strong>Pickup Date:</strong>{" "}
              {donation.pickedAt?.toDate
                ? donation.pickedAt.toDate().toLocaleString()
                : "Pending"}
            </p>
            <p>
              <strong>Delivery Date:</strong>{" "}
              {donation.deliveredAt?.toDate
                ? donation.deliveredAt.toDate().toLocaleString()
                : "Pending"}
            </p>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Timeline</h3>
            <div style={styles.timeline}>
              {statusSteps.map((step, index) => {
                const isActive = index <= Math.max(0, currentIndex - 1);
                return (
                  <div
                    key={step}
                    style={{
                      ...styles.timelineItem,
                      opacity: isActive ? 1 : 0.55,
                    }}
                  >
                    <div
                      style={{
                        ...styles.timelineDot,
                        background: isActive ? "#16a34a" : "#cbd5e1",
                      }}
                    />
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Pickup Proof</h3>
            {donation.proofImageUrl ? (
              <img
                src={donation.proofImageUrl}
                alt="Pickup proof"
                style={styles.image}
              />
            ) : (
              <p>No pickup proof uploaded yet.</p>
            )}
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Delivery Proof</h3>
            {donation.deliveryProofImageUrl ? (
              <img
                src={donation.deliveryProofImageUrl}
                alt="Delivery proof"
                style={styles.image}
              />
            ) : (
              <p>No delivery proof uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    padding: "32px",
    fontFamily: "Poppins, sans-serif",
  },
  card: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "white",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "#6d28d9",
    fontWeight: 700,
    fontSize: "12px",
    margin: 0,
  },
  title: {
    fontSize: "26px",
    margin: "6px 0 0",
    color: "#111827",
  },
  badge: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: 700,
  },
  successBox: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "14px",
    padding: "14px 16px",
    marginBottom: "18px",
    color: "#065f46",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    background: "#fafafa",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#111827",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  timelineItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  image: {
    width: "100%",
    maxHeight: "280px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
};

export default DonorTracking;
