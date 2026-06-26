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
      showNotification(`Event "${event.title}" has been approved successfully!`);
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
      showNotification(`Event "${event.title}" has been rejected. Reason: "${reason}"`);
      closeRejectModal();
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
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: "500" }}>Loading orchestration panels...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />

      <div style={styles.mainContent}>
        {/* Header Unit */}
        <div style={styles.headerDashboard}>
          <div>
            <h1 style={styles.headingMain}>Events Management</h1>
            <p style={styles.subtitleMain}>Approve, filter, and moderate upcoming NGO foundation drives</p>
          </div>
          <div style={styles.totalBadgePanel}>
            <i className="fas fa-calendar-check" style={{ color: "#3b82f6" }}></i>
            <span>{events.length} Total Logs</span>
          </div>
        </div>

        {notification.show && (
          <div style={styles.notification}>
            <i className="fas fa-sparkles" style={{ marginRight: "10px", fontSize: "16px" }}></i>
            {notification.message}
          </div>
        )}

        {/* ── PENDING GRID VIEW ── */}
        <div style={styles.sectionArea}>
          <h2 style={styles.subHeading}>
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="fas fa-hourglass-start" style={{ color: "#f59e0b" }}></i>
              Pending Verification Requests
            </span>
            <span style={styles.badgeOrange}>{pendingEvents.length} Tasks</span>
          </h2>

          <div style={styles.pendingGrid}>
            {pendingEvents.map((event) => (
              <div key={event.id} style={styles.premiumCard}>
                <div style={styles.cardAccentBar}></div>
                <div style={styles.premiumCardBody}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <h3 style={styles.eventTitle}>{event.title}</h3>
                    <span style={styles.eventTypeTag}>
                      {event.eventType === "Celebration" && "🎂"}
                      {event.eventType === "Donation Drive" && "🎁"}
                      {event.eventType === "Awareness" && "📣"}{" "}
                      {event.eventType}
                    </span>
                  </div>

                  <p style={styles.descriptionText}>
                    {event.description || "No description logged by the organizer."}
                  </p>

                  <div style={styles.metaInformationList}>
                    <div style={styles.metaRow}>
                      <i className="fas fa-circle-user" style={{ color: "#6366f1" }}></i>
                      <span style={{ color: "#1e293b", fontWeight: "600" }}>{event.userName || "—"}</span>
                      {event.userEmail && <span style={styles.emailBadgeChip}>{event.userEmail}</span>}
                    </div>

                    <div style={styles.gridDetailsTwoColumn}>
                      <div style={styles.metaRow}>
                        <i className="fas fa-calendar-day" style={{ color: "#009966" }}></i>
                        <span>{formatDate(event.eventDate)}</span>
                      </div>
                      <div style={styles.metaRow}>
                        <i className="fas fa-clock" style={{ color: "#ef4444" }}></i>
                        {event.timeSlot ? <span style={styles.timeSlotPill}>{event.timeSlot}</span> : <span style={{ color: "#94a3b8" }}>N/A</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.cardActionsRow}>
                  <button style={styles.actionApproveButton} onClick={() => acceptEvent(event.id)}>
                    <i className="fas fa-check-double"></i> Approve
                  </button>
                  <button style={styles.actionRejectButton} onClick={() => openRejectModal(event.id)}>
                    <i className="fas fa-ban"></i> Reject
                  </button>
                </div>
              </div>
            ))}

            {pendingEvents.length === 0 && (
              <div style={styles.cleanEmptyState}>
                <i className="fas fa-circle-check" style={{ fontSize: "52px", color: "#10b981", marginBottom: "12px" }}></i>
                <p style={{ margin: 0, fontWeight: "600", color: "#1e293b" }}>All Caught Up!</p>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>No outstanding event authorizations pending.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── PROCESSED REGISTRY TABLE ── */}
        <div style={styles.sectionArea}>
          <h2 style={styles.subHeading}>
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="fas fa-box-archive" style={{ color: "#3b82f6" }}></i>
              Processed Archive History
            </span>
          </h2>

          <div style={styles.premiumTableWrapper}>
            <table style={styles.premiumTable}>
              <thead>
                <tr>
                  <th style={styles.pTh}>Event Details</th>
                  <th style={styles.pTh}>Classification</th>
                  <th style={styles.pTh}>Date Scheduled</th>
                  <th style={styles.pTh}>Time Slot</th>
                  <th style={styles.pTh}>Submitted By</th>
                  <th style={styles.pTh}>Status Badge</th>
                  <th style={styles.pTh}>Resolution Remarks</th>
                </tr>
              </thead>
              <tbody>
                {processedEvents.map((event) => (
                  <tr key={event.id} style={styles.pTableRow}>
                    <td style={styles.pTd}>
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{event.title}</span>
                    </td>
                    <td style={styles.pTd}>
                      <span style={styles.tableCategoryChip}>{event.eventType}</span>
                    </td>
                    <td style={styles.pTd}>{formatDate(event.eventDate)}</td>
                    <td style={styles.pTd}>
                      {event.timeSlot ? <span style={styles.timeSlotPill}>{event.timeSlot}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={styles.pTd}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "500", color: "#334155", fontSize: "13px" }}>{event.userName || "—"}</span>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>{event.userEmail}</span>
                      </div>
                    </td>
                    <td style={styles.pTd}>
                      <span
                        style={{
                          ...styles.premiumStatusBadge,
                          backgroundColor: event.status === "approved" ? "#ecfdf5" : "#fef2f2",
                          color: event.status === "approved" ? "#065f46" : "#991b1b",
                          border: event.status === "approved" ? "1px solid #a7f3d0" : "1px solid #fca5a5",
                        }}
                      >
                        <span style={{ ...styles.dotIndicator, backgroundColor: event.status === "approved" ? "#10b981" : "#ef4444" }}></span>
                        {event.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.pTd}>
                      {event.status === "rejected" ? (
                        <div style={styles.rejectionTextContainer}>
                          <i className="fas fa-message" style={{ fontSize: "11px", marginTop: "3px" }}></i>
                          <span>{event.rejectionReason}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {processedEvents.length === 0 && (
                  <tr>
                    <td colSpan="7" style={styles.tableEmptyStateCell}>
                      <i className="fas fa-folder-open" style={{ fontSize: "40px", color: "#cbd5e1", marginBottom: "10px", display: "block" }}></i>
                      No archival decisions registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── REJECTION SHEET MODAL OVERLAY ── */}
      {showRejectModal.show && (
        <div style={styles.modalBlurOverlay} onClick={closeRejectModal}>
          <div style={styles.modernModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTopBar}>
              <h3 style={styles.modalTitleText}>
                <i className="fas fa-triangle-exclamation" style={{ color: "#f59e0b" }}></i>
                Specify Rejection Metrics
              </h3>
              <button style={styles.circleCloseButton} onClick={closeRejectModal}>
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div style={styles.modalCenterContent}>
              <p style={styles.modalInstructionalLabel}>Select an administrative operational constraint option:</p>
              <div style={styles.radioSelectionStack}>
                {rejectionReasons.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <label
                      key={reason}
                      style={{
                        ...styles.customRadioCard,
                        borderColor: isSelected ? "#3b82f6" : "#e2e8f0",
                        backgroundColor: isSelected ? "#f0f6ff" : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        style={styles.hiddenNativeRadio}
                      />
                      <span style={{ ...styles.customRadioCircle, borderColor: isSelected ? "#3b82f6" : "#cbd5e1" }}>
                        {isSelected && <span style={styles.customRadioInnerCircle}></span>}
                      </span>
                      <span style={styles.radioLabelStringText}>{reason}</span>
                    </label>
                  );
                })}
              </div>

              {selectedReason === "Other" && (
                <textarea
                  style={styles.premiumTextareaField}
                  placeholder="Elaborate administrative logs overview context..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows="3"
                />
              )}
            </div>

            <div style={styles.modalActionButtonsFooter}>
              <button style={styles.modalDismissButton} onClick={closeRejectModal}>Cancel</button>
              <button style={styles.modalConfirmExecutionButton} onClick={confirmReject}>Confirm Denial</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── ADVANCED CORE UI DESIGN STYLE SHEET METRICS ──────────────────────────────
const styles = {
  mainContent: {
    position: "absolute",
    top: 0,
    left: "250px",
    right: 0,
    bottom: 0,
    padding: "32px 40px",
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  headerDashboard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "20px",
  },
  headingMain: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  subtitleMain: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  totalBadgePanel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#e0f2fe",
    padding: "10px 16px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0369a1",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3.5px solid #e2e8f0",
    borderTop: "3.5px solid #009966",
    borderRadius: "50%",
    animation: "spin 0.85s cubic-bezier(0.4, 0, 0.2, 1) infinite",
  },
  notification: {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    color: "#15803d",
    padding: "16px 24px",
    border: "1px solid #bbf7d0",
    marginBottom: "28px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    fontWeight: "600",
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.05)",
  },
  sectionArea: {
    marginBottom: "40px",
  },
  subHeading: {
    color: "#1e293b",
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    letterSpacing: "-0.2px",
  },
  badgeOrange: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
    padding: "4px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "700",
  },
  pendingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "24px",
  },
  premiumCard: {
    backgroundColor: "white",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.02)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardAccentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #6366f1, #764ba2)",
    width: "100%",
  },
  premiumCardBody: {
    padding: "24px",
    flex: 1,
  },
  eventTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.4",
  },
  eventTypeTag: {
    backgroundColor: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    whiteSpace: "nowrap",
  },
  descriptionText: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 20px 0",
  },
  metaInformationList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "14px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#475569",
  },
  emailBadgeChip: {
    fontSize: "11px",
    backgroundColor: "white",
    color: "#6366f1",
    border: "1px solid #e0e7ff",
    borderRadius: "6px",
    padding: "1px 6px",
  },
  timeSlotPill: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    padding: "2px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "11px",
  },
  gridDetailsTwoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "4px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "10px",
  },
  cardActionsRow: {
    padding: "16px 24px",
    backgroundColor: "#fafafa",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: "12px",
  },
  actionApproveButton: {
    flex: 1,
    padding: "11px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    backgroundColor: "#009966",
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  actionRejectButton: {
    flex: 1,
    padding: "11px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    backgroundColor: "#ef4444",
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  cleanEmptyState: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "50px 20px",
    backgroundColor: "white",
    borderRadius: "20px",
    border: "1px dashed #cbd5e1",
  },
  premiumTableWrapper: {
    backgroundColor: "white",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.01)",
    overflow: "hidden",
  },
  premiumTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  pTh: {
    padding: "16px 20px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontWeight: "600",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
  },
  pTd: {
    padding: "16px 20px",
    fontSize: "13.5px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
  },
  pTableRow: {
    transition: "background-color 0.15s",
  },
  tableCategoryChip: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
  },
  premiumStatusBadge: {
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  dotIndicator: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  rejectionTextContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    color: "#991b1b",
    fontSize: "12.5px",
    fontStyle: "italic",
  },
  tableEmptyStateCell: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8",
  },
  modalBlurOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modernModalBox: {
    backgroundColor: "white",
    borderRadius: "24px",
    width: "90%",
    maxWidth: "480px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  modalTopBar: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitleText: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  circleCloseButton: {
    background: "#f1f5f9",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    color: "#64748b",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  modalCenterContent: {
    padding: "24px",
  },
  modalInstructionalLabel: {
    margin: "0 0 16px 0",
    color: "#475569",
    fontSize: "14.5px",
    fontWeight: "500",
  },
  radioSelectionStack: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  customRadioCard: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  hiddenNativeRadio: {
    display: "none",
  },
  customRadioCircle: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "12px",
    backgroundColor: "white",
  },
  customRadioInnerCircle: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
  },
  radioLabelStringText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
  },
  premiumTextareaField: {
    width: "100%",
    marginTop: "16px",
    padding: "12px 16px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    boxSizing: "border-box",
    outline: "none",
  },
  modalActionButtonsFooter: {
    padding: "16px 24px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
  },
  modalDismissButton: {
    padding: "10px 20px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    cursor: "pointer",
    backgroundColor: "white",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },
  modalConfirmExecutionButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    backgroundColor: "#ef4444",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
  },
};

const styleSheet = document.styleSheets[0];
const keyframes = `@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
styleSheet.insertRule(keyframes, styleSheet.cssRules.length);

export default Events;