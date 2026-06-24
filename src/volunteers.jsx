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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: "", type: "" });
    }, 4000);
  };

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

      <div style={styles.pageContainer}>
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

        {/* Both elements are now fully caught inside the stack configuration container layout */}
        <div style={styles.dashboardVerticalStack}>
          {/* TOP MODULE: EXPANDED REGISTRATION INTERFACE */}
          <div style={styles.donorsCard}>
            <div style={styles.donorsCardHeader}>
              <span style={styles.headerSpan}>
                <i className="fa-solid fa-user-plus"></i> Register New Volunteer
              </span>
            </div>
            <div style={styles.donorsCardBodyForm}>
              <form onSubmit={handleSubmit} style={styles.formGridElement}>
                <div style={styles.inputGroup}>
                  <label style={styles.fieldLabel}>Full Name</label>
                  <div style={styles.fieldInputWrapper}>
                    <i
                      className="fa-solid fa-user"
                      style={styles.inputIcon}
                    ></i>
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
                    <i
                      className="fa-solid fa-phone"
                      style={styles.inputIcon}
                    ></i>
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
                  <label style={styles.fieldLabel}>
                    Account Access Password
                  </label>
                  <div style={styles.fieldInputWrapper}>
                    <i
                      className="fa-solid fa-lock"
                      style={styles.inputIcon}
                    ></i>
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

                <div style={styles.buttonWrapper}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={styles.actionAddBtn}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fa solid fa-spinner fa-spin"></i>{" "}
                        Initializing...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-plus"></i> Create Agent
                        Identity
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* BOTTOM MODULE: REGISTRATION RECORD TABLE */}
          <div style={styles.donorsCard}>
            <div style={styles.donorsCardHeader}>
              <span style={styles.headerSpan}>
                <i className="fa-solid fa-users"></i> Active Fleet Volunteers
              </span>
            </div>
            <div style={styles.donorsCardBody}>
              {volunteers.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                  }}
                >
                  No active logistics operators found in system collection.
                </p>
              ) : (
                <div style={styles.tableResponsiveWrapper}>
                  <table style={styles.donorsTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Avatar & Profile</th>
                        <th style={styles.tableHeader}>Contact Details</th>
                        <th style={styles.tableHeader}>System Access ID</th>
                        <th style={styles.tableHeader}>Operation Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volunteers.map((volunteer, idx) => (
                        <tr
                          key={volunteer.id}
                          style={
                            idx % 2 === 1
                              ? styles.tableRowEven
                              : styles.tableRow
                          }
                        >
                          <td style={styles.tableCell}>
                            <div style={styles.avatarProfileGroup}>
                              <div style={styles.avatarBubble}>
                                {volunteer.name.trim()[0]?.toUpperCase() || "V"}
                              </div>
                              <span style={styles.profilePrimaryText}>
                                {volunteer.name}
                              </span>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.contactDetailsWrapper}>
                              <span>
                                <i
                                  className="fa-solid fa-envelope"
                                  style={styles.miniIcon}
                                ></i>{" "}
                                {volunteer.email}
                              </span>
                              <span>
                                <i
                                  className="fa-solid fa-phone"
                                  style={styles.miniIcon}
                                ></i>{" "}
                                {volunteer.phone || "—"}
                              </span>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={styles.identityHashText}>
                              {volunteer.id}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <button
                              onClick={() => removeVolunteer(volunteer.id)}
                              style={styles.actionRemoveBtn}
                              title="Revoke system authentication assignment"
                            >
                              <i className="fa-solid fa-user-minus"></i> Revoke
                              Access
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
      </div>
    </>
  );
};

/* ================= PREFACTORED FULL WIDTH STACK RENDERING ================= */
const styles = {
  pageContainer: {
    marginLeft: "250px",
    padding: "40px 30px",
    width: "calc(100% - 250px)",
    minHeight: "100vh",
    background: "#F8FAFC",
    fontFamily: "'Poppins', Arial, sans-serif",
    boxSizing: "border-box",
  },
  dashboardVerticalStack: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    width: "100%",
  },
  donorsCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
  },
  donorsCardHeader: {
    background: "#1E293B",
    color: "white",
    fontWeight: "bold",
    fontSize: "16px",
    padding: "18px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSpan: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  donorsCardBodyForm: {
    padding: "24px 25px",
  },
  donorsCardBody: {
    padding: "20px",
  },
  tableResponsiveWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  formGridElement: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    alignItems: "end",
    width: "100%",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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
  buttonWrapper: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  actionAddBtn: {
    padding: "12px 28px",
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
    boxShadow: "0 4px 12px rgba(54, 131, 240, 0.2)",
  },
  donorsTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  tableHeader: {
    padding: "14px",
    border: "1px solid #E2E8F0",
    fontWeight: "600",
    fontSize: "14px",
    color: "#334155",
    background: "#F8FAFC",
  },
  tableCell: {
    padding: "14px",
    border: "1px solid #E2E8F0",
    fontSize: "13px",
    color: "#475569",
    verticalAlign: "middle",
  },
  tableRow: {
    background: "white",
  },
  tableRowEven: {
    background: "#F8FAFC",
  },
  avatarProfileGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    justifyContent: "center",
  },
  avatarBubble: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #E0E7FF, #C7D2FE)",
    color: "#4338CA",
    fontWeight: "700",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profilePrimaryText: {
    fontWeight: "500",
    color: "#0F172A",
  },
  contactDetailsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    color: "#475569",
    alignItems: "center",
  },
  miniIcon: {
    width: "14px",
    color: "#94A3B8",
  },
  identityHashText: {
    fontFamily: "monospace",
    backgroundColor: "#F1F5F9",
    color: "#475569",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "13px",
  },
  actionRemoveBtn: {
    padding: "6px 14px",
    backgroundColor: "#FEF2F2",
    color: "#EF4444",
    border: "1px solid #FEE2E2",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
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
