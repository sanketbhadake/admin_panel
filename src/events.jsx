import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const Events = () => {
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState({
    show: false,
    eventId: null,
  });
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const rejectionReasons = [
    "Insufficient resources",
    "Conflict of date/time",
    "Not a priority currently",
    "Location not feasible",
    "Budget constraints",
    "Other",
  ];

  // Fetch events from Firebase
  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, "event_requests"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          eventDate: doc.data().eventDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setEvents(eventsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching events:", error);
        showNotification("Error loading events. Please refresh the page.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: "" });
    }, 4000);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ── Notify the single requester via FCM (push only) ───────────────────────
  // Writes a doc to "targeted_notifications" — a Cloud Function
  // (sendEventDecisionNotification) listens here, looks up this ONE donor's
  // fcmToken by userId, and sends just to them (not a broadcast).
  const notifyRequester = async (event, decision, reason = "") => {
    if (!event?.userId) {
      console.warn("No userId on this event request — skipping notification.");
      return;
    }

    const title =
      decision === "approved"
        ? "🎉 Your Event Request was Approved!"
        : "Event Request Update";

    const body =
      decision === "approved"
        ? `Great news! "${event.title}" has been approved.`
        : `Your request "${event.title}" was not approved. Reason: ${reason}`;

    try {
      const db = getFirestore();
      await addDoc(collection(db, "targeted_notifications"), {
        userId: event.userId,
        title,
        body,
        eventId: event.id,
        decision,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // Don't block the approve/reject flow if the notification write fails —
      // just log it, since the status update itself already succeeded.
      console.error("Failed to queue requester notification:", err);
    }
  };

  const acceptEvent = async (eventId) => {
    try {
      const db = getFirestore();
      const eventRef = doc(db, "event_requests", eventId);

      await updateDoc(eventRef, {
        status: "approved",
        rejectionReason: "",
        updatedAt: new Date(),
      });

      const event = events.find((e) => e.id === eventId);
      showNotification(
        `Event "${event.title}" has been approved successfully!`,
      );

      // Notify just this requester
      await notifyRequester(event, "approved");
    } catch (error) {
      console.error("Error approving event:", error);
      showNotification("Error approving event. Please try again.");
    }
  };

  const openRejectModal = (eventId) => {
    setShowRejectModal({ show: true, eventId });
    setSelectedReason("");
    setCustomReason("");
  };

  const closeRejectModal = () => {
    setShowRejectModal({ show: false, eventId: null });
    setSelectedReason("");
    setCustomReason("");
  };

  const confirmReject = async () => {
    const { eventId } = showRejectModal;
    const reason = selectedReason === "Other" ? customReason : selectedReason;

    if (!reason || reason.trim() === "") {
      alert("Please select or enter a rejection reason.");
      return;
    }

    try {
      const db = getFirestore();
      const eventRef = doc(db, "event_requests", eventId);

      await updateDoc(eventRef, {
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      });

      const event = events.find((e) => e.id === eventId);
      showNotification(
        `Event "${event.title}" has been rejected. Reason: "${reason}"`,
      );
      closeRejectModal();

      // Notify just this requester
      await notifyRequester(event, "rejected", reason);
    } catch (error) {
      console.error("Error rejecting event:", error);
      showNotification("Error rejecting event. Please try again.");
    }
  };

  const pendingEvents = events.filter((e) => e.status === "pending");
  const processedEvents = events.filter((e) => e.status !== "pending");

  if (loading) {
    return (
      <div style={styles.mainContent}>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
      />

      <div style={styles.mainContent}>
        <div style={styles.container}>
          <h1 style={styles.heading}>
            <i className="fas fa-calendar-alt" style={{ marginRight: "10px" }}></i>
            Events Management
          </h1>

          {notification.show && (
            <div style={styles.notification}>
              <i className="fas fa-info-circle" style={{ marginRight: "8px" }}></i>
              {notification.message}
            </div>
          )}

          {/* ── PENDING EVENTS ── */}
          <div style={styles.section}>
            <h2 style={styles.subHeading}>
              <i className="fas fa-clock" style={{ marginRight: "8px", color: "#ff9800" }}></i>
              Pending Event Requests
              <span style={styles.badge}>{pendingEvents.length}</span>
            </h2>

            <div style={styles.pendingList}>
              {pendingEvents.map((event) => (
                <div key={event.id} style={styles.eventCard}>
                  {/* Card Header */}
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.eventTitle}>{event.title}</h3>
                      <span style={styles.eventType}>
                        {event.eventType === "Celebration" && "🎂"}
                        {event.eventType === "Donation Drive" && "🎁"}
                        {event.eventType === "Awareness" && "📣"}{" "}
                        {event.eventType}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={styles.cardBody}>
                    <p style={styles.description}>
                      {event.description || "No description provided"}
                    </p>

                    <div style={styles.eventDetails}>
                      {/* Requested By — name + email */}
                      <div style={styles.detailItem}>
                        <i className="fas fa-user" style={styles.icon}></i>
                        <strong>Requested by:&nbsp;</strong>
                        <span style={styles.nameText}>
                          {event.userName || "—"}
                        </span>
                        {event.userEmail && (
                          <span style={styles.emailChip}>
                            {event.userEmail}
                          </span>
                        )}
                      </div>

                      {/* Event Date */}
                      <div style={styles.detailItem}>
                        <i className="fas fa-calendar" style={styles.icon}></i>
                        <strong>Event Date:&nbsp;</strong>
                        {formatDate(event.eventDate)}
                      </div>

                      {/* Time Slot */}
                      <div style={styles.detailItem}>
                        <i className="fas fa-clock" style={styles.icon}></i>
                        <strong>Time Slot:&nbsp;</strong>
                        {event.timeSlot ? (
                          <span style={styles.timeSlotChip}>
                            <i className="fas fa-hourglass-half" style={{ marginRight: "5px", fontSize: "11px" }}></i>
                            {event.timeSlot}
                          </span>
                        ) : (
                          <span style={{ color: "#aaa" }}>Not specified</span>
                        )}
                      </div>

                      {/* Submitted on */}
                      <div style={styles.detailItem}>
                        <i className="fas fa-paper-plane" style={styles.icon}></i>
                        <strong>Submitted:&nbsp;</strong>
                        {formatDate(event.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={styles.actions}>
                    <button
                      style={styles.acceptButton}
                      onClick={() => acceptEvent(event.id)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#45a049")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#4caf50")}
                    >
                      <i className="fas fa-check" style={{ marginRight: "6px" }}></i>
                      Approve
                    </button>
                    <button
                      style={styles.rejectButton}
                      onClick={() => openRejectModal(event.id)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#da190b")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
                    >
                      <i className="fas fa-times" style={{ marginRight: "6px" }}></i>
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {pendingEvents.length === 0 && (
                <div style={styles.noEvents}>
                  <i className="fas fa-check-circle" style={{ fontSize: "48px", color: "#4caf50", marginBottom: "10px" }}></i>
                  <p>No pending event requests</p>
                </div>
              )}
            </div>
          </div>

          {/* ── PROCESSED EVENTS TABLE ── */}
          <div style={styles.section}>
            <h2 style={styles.subHeading}>
              <i className="fas fa-list" style={{ marginRight: "8px", color: "#2196f3" }}></i>
              Processed Events
            </h2>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event Name</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Event Date</th>
                    <th style={styles.th}>Time Slot</th>
                    <th style={styles.th}>Requested By</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Rejection Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {processedEvents.map((event) => (
                    <tr key={event.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <strong>{event.title}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.typeChip}>
                          {event.eventType === "Celebration" && "🎂"}
                          {event.eventType === "Donation Drive" && "🎁"}
                          {event.eventType === "Awareness" && "📣"}{" "}
                          {event.eventType}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(event.eventDate)}</td>

                      {/* Time Slot column */}
                      <td style={styles.td}>
                        {event.timeSlot ? (
                          <span style={styles.timeSlotChip}>
                            <i className="fas fa-hourglass-half" style={{ marginRight: "5px", fontSize: "11px" }}></i>
                            {event.timeSlot}
                          </span>
                        ) : (
                          <span style={{ color: "#bbb" }}>—</span>
                        )}
                      </td>

                      {/* Requested By — name + email stacked */}
                      <td style={styles.td}>
                        <div style={styles.requesterCell}>
                          <span style={styles.requesterName}>
                            <i className="fas fa-user-circle" style={{ marginRight: "5px", color: "#667eea" }}></i>
                            {event.userName || "—"}
                          </span>
                          {event.userEmail && (
                            <span style={styles.requesterEmail}>
                              {event.userEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: event.status === "approved" ? "#e8f5e9" : "#ffebee",
                            color: event.status === "approved" ? "#2e7d32" : "#c62828",
                          }}
                        >
                          {event.status === "approved" && (
                            <i className="fas fa-check-circle" style={{ marginRight: "4px" }}></i>
                          )}
                          {event.status === "rejected" && (
                            <i className="fas fa-times-circle" style={{ marginRight: "4px" }}></i>
                          )}
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </td>

                      <td style={{ ...styles.td, ...styles.rejectionReasonCell }}>
                        {event.status === "rejected" ? (
                          <span style={styles.rejectionReason}>
                            <i className="fas fa-exclamation-circle" style={{ marginRight: "4px" }}></i>
                            {event.rejectionReason}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}

                  {processedEvents.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ ...styles.td, textAlign: "center", padding: "30px" }}>
                        <i className="fas fa-inbox" style={{ fontSize: "36px", color: "#ccc", marginBottom: "10px", display: "block" }}></i>
                        No processed events yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal.show && (
        <div style={styles.modalOverlay} onClick={closeRejectModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: "8px", color: "#ff9800" }}></i>
                Reject Event Request
              </h3>
              <button style={styles.closeButton} onClick={closeRejectModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Please select a reason for rejecting this event request:
              </p>

              <div style={styles.radioGroup}>
                {rejectionReasons.map((reason) => (
                  <label key={reason} style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      style={styles.radioInput}
                    />
                    <span style={styles.radioText}>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === "Other" && (
                <textarea
                  style={styles.textarea}
                  placeholder="Please specify the reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows="3"
                />
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelButton} onClick={closeRejectModal}>
                Cancel
              </button>
              <button style={styles.confirmRejectButton} onClick={confirmReject}>
                <i className="fas fa-ban" style={{ marginRight: "6px" }}></i>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  mainContent: {
    position: "absolute",
    top: 0,
    left: "250px",
    right: 0,
    bottom: 0,
    padding: "25px 30px",
    fontFamily: "'Poppins', Arial, sans-serif",
    backgroundColor: "#f4f4f4",
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  container: {
    width: "100%",
    height: "auto",
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    boxSizing: "border-box",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #3683F0",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  heading: {
    color: "#333",
    fontSize: "28px",
    marginBottom: "25px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: "40px",
  },
  subHeading: {
    color: "#333",
    fontSize: "20px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "10px",
  },
  badge: {
    marginLeft: "10px",
    backgroundColor: "#ff9800",
    color: "white",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  notification: {
    background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
    color: "#2e7d32",
    padding: "15px 20px",
    border: "1px solid #4caf50",
    marginBottom: "20px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    fontWeight: "500",
  },
  pendingList: {
    display: "grid",
    gap: "16px",
  },
  eventCard: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    transition: "all 0.3s ease",
    overflow: "hidden",
  },
  cardHeader: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "16px 20px",
    color: "white",
  },
  eventTitle: {
    margin: "0 0 8px 0",
    fontSize: "20px",
    fontWeight: "600",
  },
  eventType: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "500",
  },
  cardBody: {
    padding: "20px",
  },
  description: {
    color: "#666",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
  eventDetails: {
    display: "grid",
    gap: "10px",
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    color: "#555",
    fontSize: "14px",
    gap: "4px",
  },
  icon: {
    marginRight: "8px",
    color: "#3683F0",
    width: "16px",
  },
  // Name shown in the pending card detail row
  nameText: {
    fontWeight: "600",
    color: "#333",
  },
  // Small email pill next to the name in pending card
  emailChip: {
    marginLeft: "6px",
    backgroundColor: "#f0f4ff",
    color: "#3683F0",
    border: "1px solid #c7d9ff",
    borderRadius: "20px",
    padding: "2px 10px",
    fontSize: "12px",
    fontWeight: "500",
  },
  // Time slot pill used in both card and table
  timeSlotChip: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: "600",
  },
  actions: {
    padding: "16px 20px",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    gap: "10px",
  },
  acceptButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    flex: 1,
  },
  rejectButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#f44336",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    flex: 1,
  },
  noEvents: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#999",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "white",
    borderRadius: "8px",
    overflow: "hidden",
  },
  th: {
    border: "1px solid #e0e0e0",
    padding: "14px",
    textAlign: "left",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  td: {
    border: "1px solid #e0e0e0",
    padding: "14px",
    textAlign: "left",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  tableRow: {
    transition: "background 0.15s",
  },
  typeChip: {
    backgroundColor: "#f5f5f5",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  // Stacked name + email inside the table cell
  requesterCell: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  requesterName: {
    fontWeight: "600",
    color: "#333",
    fontSize: "13px",
  },
  requesterEmail: {
    color: "#888",
    fontSize: "12px",
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  rejectionReasonCell: {
    maxWidth: "250px",
  },
  rejectionReason: {
    color: "#c62828",
    fontStyle: "italic",
    display: "flex",
    alignItems: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "500px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#333",
    display: "flex",
    alignItems: "center",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  },
  modalBody: {
    padding: "24px",
  },
  modalText: {
    marginBottom: "16px",
    color: "#666",
    fontSize: "15px",
  },
  radioGroup: {
    display: "grid",
    gap: "12px",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  radioInput: {
    marginRight: "10px",
    cursor: "pointer",
    width: "18px",
    height: "18px",
  },
  radioText: {
    fontSize: "15px",
    color: "#333",
  },
  textarea: {
    width: "100%",
    marginTop: "12px",
    padding: "12px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "'Poppins', Arial, sans-serif",
    resize: "vertical",
    boxSizing: "border-box",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: "10px 24px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "white",
    color: "#666",
    fontSize: "15px",
    fontWeight: "600",
  },
  confirmRejectButton: {
    padding: "10px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#f44336",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
  },
};

// Add keyframes for spinner animation
const styleSheet = document.styleSheets[0];
const keyframes = `@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
styleSheet.insertRule(keyframes, styleSheet.cssRules.length);

export default Events;