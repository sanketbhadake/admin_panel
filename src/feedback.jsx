import React, { useState, useEffect } from "react";
import { db } from "./firebase/firebase"; // Keep your project's path
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setFeedbackList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore loading error: ", error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const toggleReadStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "read" ? "unread" : "read";
    try {
      await updateDoc(doc(db, "feedback", id), { status: nextStatus });
    } catch (e) {
      alert("Failed to update entry status: " + e.message);
    }
  };

  const deleteFeedback = async (id) => {
    if (window.confirm("Permanently delete this user review?")) {
      try {
        await deleteDoc(doc(db, "feedback", id));
      } catch (e) {
        alert("Delete operational failure: " + e.message);
      }
    }
  };

  // Helper properties to render rating stars dynamically
  const renderStars = (rating) => {
    const stars = [];
    const activeStars = Math.min(5, Math.max(0, Math.round(rating || 0)));
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa-solid fa-star ${i <= activeStars ? "" : "fa-star-half-stroke"}`}
          style={{
            color: i <= activeStars ? "#ffb300" : "#cbd5e1",
            fontSize: "12px",
            marginRight: "2px",
          }}
        ></i>
      );
    }
    return stars;
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />

      <div style={styles.mainContent}>
        {/* Top Header Dashboard Unit */}
        <div style={styles.dashboardHeader}>
          <div>
            <h1 style={styles.heading}>
              <i className="fa-solid fa-comments" style={{ marginRight: "12px", color: "#8B56EC" }}></i>
              User Reviews & Feedback
            </h1>
            <p style={styles.subHeadingText}>Review platform experience metrics and complete donor quality optimization</p>
          </div>
          {!loading && (
            <div style={styles.counterCard}>
              <span style={styles.counterNum}>{feedbackList.length}</span>
              <span style={styles.counterLabel}>Total Reviews</span>
            </div>
          )}
        </div>

        {/* LOADING SHIMMER MASK */}
        {loading ? (
          <div style={styles.shimmerContainer}>
            {List.generate(3, (i) => (
              <div key={i} style={styles.shimmerCard}></div>
            ))}
          </div>
        ) : feedbackList.length === 0 ? (
          /* EMPTY STATE LAYOUT */
          <div style={styles.emptyStateBox}>
            <i className="fa-solid fa-folder-open" style={styles.emptyIcon}></i>
            <h3 style={styles.emptyTitle}>No Reviews Recieved Yet</h3>
            <p style={styles.emptySubtitle}>Platform feedback logs emitted from mobile accounts will match this registry channel grid.</p>
          </div>
        ) : (
          /* ADVANCED TABLE PANEL GRID */
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Donor Account</th>
                  <th style={styles.th}>Contact Meta</th>
                  <th style={styles.th}>Rating Metrics</th>
                  <th style={styles.th}>Message Content Statement</th>
                  <th style={styles.th}>Logged Timestamp</th>
                  <th style={styles.th} style={{ textAlign: "right", paddingRight: "24px" }}>Action Handlers</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((item) => {
                  const isRead = item.status === "read";
                  const dateObj = item.createdAt?.toDate ? item.createdAt.toDate() : null;
                  const dateStr = dateObj ? dateObj.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—";

                  return (
                    <tr
                      key={item.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: isRead ? "#ffffff" : "#fbfaff",
                        borderLeft: isRead ? "4px solid transparent" : "4px solid #8B56EC",
                      }}
                    >
                      <td style={styles.td}>
                        <div style={styles.profileCell}>
                          {item.donorProfileImage ? (
                            <img src={item.donorProfileImage} alt="" style={styles.avatar} />
                          ) : (
                            <div style={styles.avatarPlaceholder}>
                              <i className="fa-solid fa-user" style={{ fontSize: "13px" }}></i>
                            </div>
                          )}
                          <span style={styles.boldText}>{item.donorName || "Anonymous Supporter"}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.emailText}>{item.donorEmail || "—"}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={styles.ratingBadge}>
                            {item.rating || 0} / 5
                          </span>
                          <div style={{ display: "flex" }}>{renderStars(item.rating)}</div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, ...styles.messageCell }}>
                        <p style={styles.messageContentText}>{item.message || "No contextual comments provided by the donor user account."}</p>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateStampText}>{dateStr}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            onClick={() => toggleReadStatus(item.id, item.status)}
                            style={{
                              ...styles.actionBtn,
                              color: isRead ? "#64748b" : "#8B56EC",
                              backgroundColor: isRead ? "#f1f5f9" : "#f3effe",
                            }}
                            title={isRead ? "Mark as unread" : "Mark as read"}
                          >
                            <i className={`fa-solid ${isRead ? "fa-envelope-open" : "fa-envelope"}`}></i>
                          </button>
                          <button
                            onClick={() => deleteFeedback(item.id)}
                            style={{
                              ...styles.actionBtn,
                              color: "#ef4444",
                              backgroundColor: "#fef2f2",
                            }}
                            title="Delete review entry logs"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// ── ADVANCED CORE COMPONENT DESIGN STYLE SHEET MATRIX ──────────────────────
const styles = {
  mainContent: {
    position: "absolute",
    top: 0,
    left: "250px",
    right: 0,
    bottom: 0,
    padding: "32px 40px",
    fontFamily: "'Poppins', system-ui, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  dashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "24px",
  },
  heading: {
    color: "#0f172a",
    margin: 0,
    fontSize: "26px",
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },
  subHeadingText: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  counterCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#f5f0ff",
    border: "1px solid #e9ddff",
    padding: "10px 20px",
    borderRadius: "16px",
    minWidth: "100px",
  },
  counterNum: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#8B56EC",
    lineHeight: 1,
  },
  counterLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#7c3aed",
    marginTop: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.2px",
  },
  shimmerContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  shimmerCard: {
    width: "100%",
    height: "80px",
    backgroundColor: "#e2e8f0",
    borderRadius: "16px",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  emptyStateBox: {
    textAlign: "center",
    padding: "60px 24px",
    backgroundColor: "white",
    borderRadius: "24px",
    border: "1px dashed #cbd5e1",
    maxWidth: "500px",
    margin: "40px auto 0 auto",
  },
  emptyIcon: {
    fontSize: "48px",
    color: "#cbd5e1",
    marginBottom: "16px",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
  },
  emptySubtitle: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "13.5px",
    lineHeight: "1.5",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "20px",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.015)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    backgroundColor: "#f8fafc",
    color: "#475569",
    padding: "16px 20px",
    fontWeight: "600",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "16px 20px",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  profileCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1.5px solid #e2e8f0",
  },
  avatarPlaceholder: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1.5px solid #e2e8f0",
  },
  boldText: {
    fontWeight: "600",
    color: "#0f172a",
    fontSize: "14px",
  },
  emailText: {
    color: "#64748b",
    fontSize: "13.5px",
    fontWeight: "500",
  },
  ratingBadge: {
    backgroundColor: "#fffbeb",
    color: "#b45309",
    padding: "2px 8px",
    borderRadius: "6px",
    fontWeight: "700",
    fontSize: "12px",
    border: "1px solid #fef3c7",
    display: "inline-block",
  },
  messageCell: {
    maxWidth: "340px",
  },
  messageContentText: {
    margin: 0,
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  dateStampText: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  actionBtn: {
    border: "none",
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    transition: "transform 0.1s ease",
    outline: "none",
  },
};

// Global keyframe definitions mapping array setup handling skeleton loader effect execution tracks
const styleSheet = document.styleSheets[0];
const keyframes = `@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}`;
styleSheet.insertRule(keyframes, styleSheet.cssRules.length);

// Helper helper simulation interface matching structure elements
const List = {
  generate: (count, callback) => Array.from({ length: count }, (_, i) => callback(i)),
};

export default Feedback;