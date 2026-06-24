import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase/firebase";
// Adjust this path to match your project setup
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

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
      />
      <div style={styles.mainContent}>
        <div style={styles.container}>
          <h1 style={styles.heading}>
            <i
              className="fa-solid fa-comments"
              style={{ marginRight: "14px", color: "#8B56EC" }}
            ></i>
            User Feedback Panel
          </h1>

          {loading ? (
            <div style={styles.centerText}>Streaming platform logs...</div>
          ) : feedbackList.length === 0 ? (
            <div style={styles.centerText}>No reviews left by users yet.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Donor</th>
                    <th style={styles.th}>Contact Info</th>
                    <th style={styles.th}>Rating</th>
                    <th style={styles.th}>Message Text</th>
                    <th style={styles.th}>Submitted On</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackList.map((item) => {
                    const isRead = item.status === "read";
                    const dateObj = item.createdAt?.toDate
                      ? item.createdAt.toDate()
                      : null;
                    const dateStr = dateObj
                      ? dateObj.toLocaleDateString()
                      : "—";

                    return (
                      <tr
                        key={item.id}
                        style={{
                          ...styles.tr,
                          backgroundColor: isRead ? "#ffffff" : "#f8f6ff",
                        }}
                      >
                        <td style={styles.td}>
                          <div style={styles.profileCell}>
                            {item.donorProfileImage ? (
                              <img
                                src={item.donorProfileImage}
                                alt=""
                                style={styles.avatar}
                              />
                            ) : (
                              <div style={styles.avatarPlaceholder}>
                                <i className="fa-solid fa-user"></i>
                              </div>
                            )}
                            <span style={styles.boldText}>
                              {item.donorName || "Anonymous"}
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>{item.donorEmail || "—"}</td>
                        <td style={styles.td}>
                          <span style={styles.ratingBadge}>
                            {item.rating || 0}{" "}
                            <i
                              className="fa-solid fa-star"
                              style={{ color: "#FFCE56", marginLeft: "3px" }}
                            ></i>
                          </span>
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            maxWidth: "350px",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.message || "—"}
                        </td>
                        <td style={styles.td}>{dateStr}</td>
                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            <button
                              onClick={() =>
                                toggleReadStatus(item.id, item.status)
                              }
                              style={{
                                ...styles.actionBtn,
                                color: isRead ? "#4b5563" : "#8B56EC",
                                backgroundColor: isRead ? "#e5e7eb" : "#ede9fe",
                              }}
                              title={isRead ? "Mark as unread" : "Mark as read"}
                            >
                              <i
                                className={`fa-solid ${isRead ? "fa-envelope-open" : "fa-envelope"}`}
                              ></i>
                            </button>
                            <button
                              onClick={() => deleteFeedback(item.id)}
                              style={{
                                ...styles.actionBtn,
                                color: "#ef4444",
                                backgroundColor: "#fee2e2",
                              }}
                              title="Delete entry"
                            >
                              <i className="fa-solid fa-trash"></i>
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
      </div>
    </>
  );
};

const styles = {
  mainContent: {
    flex: 1,
    padding: "30px",
    fontFamily: "'Poppins', Arial, sans-serif",
    backgroundColor: "#f4f4f4",
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    boxSizing: "border-box",
    position: "absolute",
    top: 0,
    left: "250px",
    right: 0,
    bottom: 0,
  },
  container: {
    width: "100%",
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    boxSizing: "border-box",
  },
  heading: {
    color: "#333",
    marginBottom: "30px",
    fontSize: "28px",
    fontWeight: "700",
  },
  centerText: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    backgroundColor: "#f8fafc",
    color: "#475569",
    padding: "14px 16px",
    fontWeight: "600",
    borderBottom: "2px solid #e2e8f0",
  },
  tr: {
    borderBottom: "1px solid #edf2f7",
    transition: "background-color 0.2s ease",
  },
  td: {
    padding: "14px 16px",
    color: "#334155",
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
  },
  avatarPlaceholder: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  boldText: {
    fontWeight: "500",
    color: "#0f172a",
  },
  ratingBadge: {
    backgroundColor: "#fffbeb",
    color: "#b45309",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    border: "1px solid #fef3c7",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    border: "none",
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default Feedback;
