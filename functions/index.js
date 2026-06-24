import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./firebase/firebase";

const Volunteers = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  /* ================= INPUT HANDLER ================= */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ================= FETCH VOLUNTEERS ================= */
  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "volunteers"));
        const list = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVolunteers(list);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchVolunteers();
  }, []);

  /* ================= SHOW FEEDBACK ================= */
  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: "", type: "" });
    }, 4000);
  };

  /* ================= ADD VOLUNTEER ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      formData.name &&
      formData.email &&
      formData.phone &&
      formData.password
    ) {
      setIsSubmitting(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );

        const userUid = userCredential.user.uid;

        const newVolunteerDoc = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          uid: userUid,
          role: "volunteer",
          profilePic: "",
          createdAt: new Date(),
        };

        await setDoc(doc(db, "volunteers", userUid), newVolunteerDoc);

        setVolunteers([
          ...volunteers,
          {
            id: userUid,
            ...newVolunteerDoc,
          },
        ]);

        setFormData({ name: "", email: "", phone: "", password: "" });
        showFeedback("Volunteer registered successfully!", "success");
      } catch (error) {
        console.error("Error adding volunteer:", error);
        showFeedback("Failed to add volunteer: " + error.message, "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showFeedback("Please fill in all fields.", "error");
    }
  };

  /* ================= REMOVE VOLUNTEER ================= */
  const removeVolunteer = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to revoke this volunteer's account assignment?",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "volunteers", id));
      setVolunteers(volunteers.filter((v) => v.id !== id));
      showFeedback(
        "Volunteer removed successfully from system nodes.",
        "success",
      );
    } catch (error) {
      showFeedback("Failed to remove volunteer from database.", "error");
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
      />

      <div style={styles.mainContent}>
        {/* Banner Snackbar Feedback Element */}
        {feedback.message && (
          <div
            style={{
              ...styles.feedbackToast,
              backgroundColor:
                feedback.type === "success" ? "#d4edda" : "#f8d7da",
              color: feedback.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${feedback.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            }}
          >
            <i
              className={
                feedback.type === "success"
                  ? "fa-solid fa-circle-check"
                  : "fa-solid fa-triangle-exclamation"
              }
            ></i>
            &nbsp;&nbsp;{feedback.message}
          </div>
        )}

        {/* Dynamic Split Grid View Setup */}
        <div style={styles.dashboardSplitGrid}>
          {/* LEFT INTERFACE: INPUT REGISTRATION CARD */}
          <div style={styles.cardContainer}>
            <h2 style={styles.subHeading}>
              <i
                className="fa-solid fa-user-plus"
                style={{ color: "#3683F0" }}
              ></i>{" "}
              Register New Volunteer
            </h2>
            <p style={styles.captionText}>
              Creates a valid system authentication profile mapping the
              volunteer role instantly.
            </p>

            <form onSubmit={handleSubmit} style={styles.formElement}>
              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Full Name</label>
                <div style={styles.fieldInputWrapper}>
                  <i className="fa-solid fa-user" style={styles.inputIcon}></i>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Email Address</label>
                <div style={styles.fieldInputWrapper}>
                  <i
                    className="fa-solid fa-envelope"
                    style={styles.inputIcon}
                  ></i>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="johndoe@gmail.com"
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Phone Number</label>
                <div style={styles.fieldInputWrapper}>
                  <i className="fa-solid fa-phone" style={styles.inputIcon}></i>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 XXXXX XXXXX"
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Account Access Password</label>
                <div style={styles.fieldInputWrapper}>
                  <i className="fa-solid fa-lock" style={styles.inputIcon}></i>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="•••••••• (Min 6 Characters)"
                    style={styles.inputField}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={styles.actionAddBtn}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Initializing
                    Account...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-plus"></i> Create Agent
                    Identity
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT INTERFACE: LIVE MONITORING REGISTRATION RECORD TABLE */}
          <div style={{ ...styles.cardContainer, flex: 1.4 }}>
            <h2 style={styles.subHeading}>
              <i className="fa-solid fa-users" style={{ color: "#8B56EC" }}></i>{" "}
              Active Fleet Volunteers
            </h2>
            <p style={styles.captionText}>
              Real-time logs of security authorized couriers tracking logistics
              payloads.
            </p>

            {volunteers.length === 0 ? (
              <div style={styles.emptyContainer}>
                <i
                  className="fa-solid fa-folder-open"
                  style={{
                    fontSize: "40px",
                    color: "#CBD5E1",
                    marginBottom: "12px",
                  }}
                ></i>
                <p>No active logistics operators found in system collection.</p>
              </div>
            ) : (
              <div style={styles.tableResponsiveWrapper}>
                <table style={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.tableTh, width: "28%" }}>
                        Avatar & Profile
                      </th>
                      <th style={{ ...styles.tableTh, width: "34%" }}>
                        Contact Details
                      </th>
                      <th style={{ ...styles.tableTh, width: "22%" }}>
                        System Access ID
                      </th>
                      <th style={{ ...styles.tableTh, width: "16%" }}>
                        Operation Control
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map((volunteer) => (
                      <tr key={volunteer.id} style={styles.tableTr}>
                        <td style={styles.tableTd}>
                          <div style={styles.avatarProfileGroup}>
                            <div style={styles.avatarBubble}>
                              {volunteer.name.trim()[0].toUpperCase()}
                            </div>
                            <span style={styles.profilePrimaryText}>
                              {volunteer.name}
                            </span>
                          </div>
                        </td>
                        <td style={styles.tableTd}>
                          <div style={styles.contactDetailsWrapper}>
                            <span style={styles.contactItem}>
                              <i
                                className="fa-solid fa-envelope-open"
                                style={styles.miniIcon}
                              ></i>
                              {volunteer.email}
                            </span>
                            <span style={styles.contactItem}>
                              <i
                                className="fa-solid fa-phone"
                                style={styles.miniIcon}
                              ></i>
                              {volunteer.phone || "—"}
                            </span>
                          </div>
                        </td>
                        <td style={styles.tableTd}>
                          <span style={styles.identityHashText}>
                            {volunteer.id.substring(0, 8)}...
                          </span>
                        </td>
                        <td style={styles.tableTd}>
                          <button
                            onClick={() => removeVolunteer(volunteer.id)}
                            style={styles.actionRemoveBtn}
                            title="Revoke system authentication assignment"
                          >
                            <i className="fa-solid fa-user-minus"></i> Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ================= STYLES SHEET ================= */
const styles = {
  mainContent: {
    marginLeft: "250px",
    padding: "40px 32px",
    backgroundColor: "#F8FAFC",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Poppins', Arial, sans-serif",
    boxSizing: "border-box",
    width: "calc(100% - 250px)",
  },
  dashboardSplitGrid: {
    display: "flex",
    gap: "30px",
    alignItems: "stretch",
    flexWrap: "wrap",
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  cardContainer: {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "30px",
    boxShadow:
      "0 1px 3px rgba(15, 23, 42, 0.03), 0 4px 12px rgba(15, 23, 42, 0.03)",
    border: "1px solid #E2E8F0",
    flex: "1 1 380px",
    boxSizing: "border-box",
  },
  subHeading: {
    color: "#0F172A",
    margin: "0 0 6px 0",
    fontSize: "18px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  captionText: {
    fontSize: "13px",
    color: "#64748B",
    margin: "0 0 24px 0",
  },
  formElement: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  fieldInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#94A3B8",
    fontSize: "14px",
  },
  inputField: {
    width: "100%",
    padding: "12px 14px 12px 40px",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
    transition: "all 0.2s ease",
    outline: "none",
  },
  actionAddBtn: {
    padding: "14px",
    background: "linear-gradient(90deg, #3683F0, #8B56EC)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "10px",
    boxShadow: "0 4px 12px rgba(54, 131, 240, 0.2)",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#94A3B8",
    fontSize: "14px",
  },
  tableResponsiveWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "10px",
    border: "1px solid #E2E8F0",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px",
    tableLayout: "fixed",      // ← FIXED: enforces column widths
  },
  tableTh: {
    backgroundColor: "#F8FAFC",
    color: "#475569",
    padding: "14px 16px",
    fontWeight: "600",
    borderBottom: "2px solid #E2E8F0",
    whiteSpace: "nowrap",      // ← FIXED: headers stay on one line
    overflow: "hidden",
  },
  tableTr: {
    borderBottom: "1px solid #F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  tableTd: {
    padding: "14px 16px",
    color: "#334155",
    verticalAlign: "middle",
    overflow: "hidden",
  },
  avatarProfileGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,               // ← FIXED: allows flex children to shrink
  },
  avatarBubble: {
    width: "36px",
    height: "36px",
    minWidth: "36px",          // ← FIXED: prevents avatar from shrinking
    borderRadius: "50%",
    background: "linear-gradient(135deg, #E0E7FF, #C7D2FE)",
    color: "#4338CA",
    fontWeight: "700",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
  },
  profilePrimaryText: {
    fontWeight: "600",
    color: "#0F172A",
    overflow: "hidden",
    textOverflow: "ellipsis",  // ← FIXED: long names truncate with ...
    whiteSpace: "nowrap",
  },
  contactDetailsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
    minWidth: 0,               // ← FIXED: allows flex children to shrink
  },
  contactItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    overflow: "hidden",
    textOverflow: "ellipsis",  // ← FIXED: long emails truncate cleanly
    whiteSpace: "nowrap",
  },
  miniIcon: {
    width: "14px",
    minWidth: "14px",          // ← FIXED: icon doesn't shrink
    color: "#94A3B8",
  },
  identityHashText: {
    fontFamily: "monospace",
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    padding: "3px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    display: "inline-block",
    whiteSpace: "nowrap",
  },
  actionRemoveBtn: {
    padding: "6px 12px",
    backgroundColor: "#FEF2F2",
    color: "#EF4444",
    border: "1px solid #FEE2E2",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",      // ← FIXED: "Revoke" button text stays inline
  },
  feedbackToast: {
    padding: "14px 20px",
    marginBottom: "24px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.01)",
  },
};

export default Volunteers;