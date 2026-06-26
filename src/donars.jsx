import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db } from "./firebase/firebase";

const storage = getStorage();

const Donors = () => {
  // Navigation State: 'items' or 'money'
  const [activeTab, setActiveTab] = useState("money");

  // Datasets
  const [moneyData, setMoneyData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null); // Row dropdown tracking state
  const [sendingReceiptId, setSendingReceiptId] = useState(null); // tracks which row is currently sending
  const [deliveryModal, setDeliveryModal] = useState({
    open: false,
    donation: null,
  });
  const [deliveryProofFile, setDeliveryProofFile] = useState(null);
  const [deliveryPreviewUrl, setDeliveryPreviewUrl] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [uploadingDeliveryProof, setUploadingDeliveryProof] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // ── 1. Real-time listener on "money_donations" collection ──────────────────
  useEffect(() => {
    const unsubMoney = onSnapshot(
      collection(db, "money_donations"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          docId: d.id,
          id: d.data().donorId ?? d.id,
          name: d.data().donorName ?? "Anonymous Supporter",
          email: d.data().email ?? "—",
          amount: d.data().amount ?? 0,
          paymentMethod: d.data().paymentMethod ?? "UPI",
          status: d.data().status ?? "pending",
          transactionId: d.data().transactionId ?? "—",
          createdAt: d.data().createdAt?.toDate?.() ?? null,
          receiptStatus: d.data().receiptStatus ?? null, // 'sent' | 'failed' | null
        }));
        setMoneyData(docs);
        if (activeTab === "money") setLoading(false);
      },
      (err) => console.error("Money tracking error:", err),
    );
    return () => unsubMoney();
  }, [activeTab]);

  // ── 2. Real-time listener on "donations" (Items) collection ─────────────────
  useEffect(() => {
    const unsubItems = onSnapshot(
      collection(db, "donations"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          docId: d.id,
          id: d.data().donorId ?? d.id,
          name: d.data().donorName ?? "—",
          email: d.data().email ?? "—",
          category: d.data().category ?? "—",
          itemDescription: d.data().itemDescription ?? "—",
          pickupLocation: d.data().pickupLocation ?? "—",
          status: d.data().status ?? "pending",
          assignedVolunteer: d.data().assignedVolunteer ?? null,
          assignedVolunteerId: d.data().assignedVolunteerId ?? "",
          proofImageUrl: d.data().proofImageUrl ?? "",
          pickedAt: d.data().pickedAt?.toDate?.() ?? null,
          pickedByVolunteerId: d.data().pickedByVolunteerId ?? "",
          deliveryProofImageUrl: d.data().deliveryProofImageUrl ?? "",
          deliveryUploadedAt: d.data().deliveryUploadedAt?.toDate?.() ?? null,
          deliveryNotes: d.data().deliveryNotes ?? "",
          deliveredAt: d.data().deliveredAt?.toDate?.() ?? null,
          deliveredByVolunteerId: d.data().deliveredByVolunteerId ?? "",
          createdAt: d.data().createdAt?.toDate?.() ?? null,
          receiptStatus: d.data().receiptStatus ?? null,
        }));
        setItemsData(docs);
        if (activeTab === "items") setLoading(false);
      },
      (err) => console.error("Items tracking error:", err),
    );
    return () => unsubItems();
  }, [activeTab]);

  // ── 3. Real-time listener on "volunteers" collection ───────────────────────
  useEffect(() => {
    const unsubVolunteers = onSnapshot(
      collection(db, "volunteers"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          uid: doc.data().uid ?? doc.id,
          name: doc.data().name ?? "Unnamed Volunteer",
        }));
        setVolunteers(list);
      },
    );
    return () => unsubVolunteers();
  }, []);

  // ── 4. Verify/Update Status Callback ───────────────────────────────────────
  const updateStatus = async (collectionName, docId, newStatus) => {
    try {
      const statusUpdate = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (newStatus === "delivered") {
        statusUpdate.deliveredAt = serverTimestamp();
        statusUpdate.notifyDonor = true;
      }
      await updateDoc(doc(db, collectionName, docId), statusUpdate);
      if (newStatus === "verified" || newStatus === "approved") {
        alert("Transaction approved successfully!");
      } else if (newStatus === "delivered") {
        alert("Donation marked as delivered. The donor will be notified.");
      }
    } catch (err) {
      console.error("updateDoc error:", err);
      alert("Failed to update status.");
    }
  };

  // ── 5. Assign Logistics Volunteer ──────────────────────────────────────────
  const assignVolunteer = async (docId, volunteer) => {
    try {
      await updateDoc(doc(db, "donations", docId), {
        assignedVolunteer: volunteer.name,
        assignedVolunteerName: volunteer.name,
        assignedVolunteerId: volunteer.uid,
        status: "assigned",
        taskAssignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAssigningId(null);
      alert(`Pickup task assigned to ${volunteer.name}.`);
    } catch (err) {
      console.error("Error mapping volunteer: ", err);
    }
  };

  // ── 6. Export Active View Context to CSV ───────────────────────────────────
  const exportTableToExcel = () => {
    let rows = [];
    let filename = "";

    if (activeTab === "money") {
      rows.push([
        "Donor ID",
        "Name",
        "Email",
        "Amount",
        "TXN ID",
        "Status",
        "Date",
      ]);
      moneyData.forEach((donor) => {
        rows.push([
          donor.id,
          donor.name,
          donor.email,
          `Rs.${donor.amount}`,
          donor.transactionId,
          donor.status,
          donor.createdAt ? donor.createdAt.toLocaleDateString() : "—",
        ]);
      });
      filename = "money_donations_report.csv";
    } else {
      rows.push([
        "Donor ID",
        "Name",
        "Email",
        "Category",
        "Description",
        "Status",
        "Assigned Volunteer",
        "Date",
      ]);
      itemsData.forEach((item) => {
        rows.push([
          item.id,
          item.name,
          item.email,
          item.category,
          item.itemDescription,
          item.status,
          item.assignedVolunteer ?? "—",
          item.createdAt ? item.createdAt.toLocaleDateString() : "—",
        ]);
      });
      filename = "item_supplies_report.csv";
    }

    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── 7. Build a Professional Signed PDF Receipt (returns jsPDF instance) ────
  const buildReceiptPdf = (donorId, name, email, details, type, createdAt) => {
    const dateStr = createdAt
      ? createdAt.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
    const receiptNo = `${type === "money" ? "FIN" : "ITM"}-${donorId.toString().slice(-6).toUpperCase()}`;
    const pdfDoc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = 595;
    const margin = 48;

    // ── Header band ──
    pdfDoc.setFillColor(30, 41, 59); // #1E293B
    pdfDoc.rect(0, 0, pageWidth, 110, "F");

    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFont("times", "bold");
    pdfDoc.setFontSize(24);
    pdfDoc.text("Hope Home Foundation", margin, 52);

    pdfDoc.setFont("times", "normal");
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(203, 213, 225); // slate-300
    pdfDoc.text("Orphan Care & Resource Distribution Management", margin, 72);

    pdfDoc.setFontSize(9);
    pdfDoc.text(
      "www.hopehomefoundation.org   •   contact@hopehomefoundation.org",
      margin,
      90,
    );

    // Accent line
    pdfDoc.setFillColor(232, 124, 62); // #e87c3e accent
    pdfDoc.rect(0, 110, pageWidth, 4, "F");

    // ── Title ──
    pdfDoc.setTextColor(26, 26, 46);
    pdfDoc.setFont("times", "bold");
    pdfDoc.setFontSize(16);
    pdfDoc.text(
      type === "money"
        ? "Official Donation Receipt"
        : "Material Donation Acknowledgement",
      margin,
      150,
    );

    pdfDoc.setFont("times", "normal");
    pdfDoc.setFontSize(10);
    pdfDoc.setTextColor(100, 116, 139);
    pdfDoc.text(`Receipt No: ${receiptNo}`, margin, 168);
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - margin, 168, {
      align: "right",
    });

    // ── Divider ──
    pdfDoc.setDrawColor(226, 232, 240);
    pdfDoc.setLineWidth(1);
    pdfDoc.line(margin, 182, pageWidth - margin, 182);

    // ── Donor info block ──
    let y = 212;
    pdfDoc.setFont("times", "bold");
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(26, 26, 46);
    pdfDoc.text("Donor Information", margin, y);
    y += 22;

    pdfDoc.setFont("times", "normal");
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(51, 65, 85);
    pdfDoc.text(`Name:`, margin, y);
    pdfDoc.text(name, margin + 90, y);
    y += 20;
    pdfDoc.text(`Email:`, margin, y);
    pdfDoc.text(email, margin + 90, y);
    y += 36;

    // ── Donation details box ──
    pdfDoc.setFillColor(248, 250, 252);
    pdfDoc.setDrawColor(226, 232, 240);
    const boxTop = y;
    const boxHeight = type === "money" ? 86 : 100;
    pdfDoc.roundedRect(
      margin,
      boxTop,
      pageWidth - margin * 2,
      boxHeight,
      6,
      6,
      "FD",
    );

    y += 26;
    pdfDoc.setFont("times", "bold");
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(26, 26, 46);
    pdfDoc.text("Donation Details", margin + 18, y);
    y += 22;

    pdfDoc.setFont("times", "normal");
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(51, 65, 85);

    if (type === "money") {
      pdfDoc.text("Amount Donated:", margin + 18, y);
      pdfDoc.setFont("times", "bold");
      pdfDoc.setTextColor(16, 163, 74);
      pdfDoc.text(
        `Rs. ${parseFloat(details.amount).toLocaleString("en-IN")}`,
        pageWidth - margin - 18,
        y,
        { align: "right" },
      );
      y += 20;
      pdfDoc.setFont("times", "normal");
      pdfDoc.setTextColor(51, 65, 85);
      pdfDoc.text("Transaction Reference:", margin + 18, y);
      pdfDoc.setFont("courier", "normal");
      pdfDoc.text(details.transactionId, pageWidth - margin - 18, y, {
        align: "right",
      });
    } else {
      pdfDoc.text("Category:", margin + 18, y);
      pdfDoc.setFont("times", "bold");
      pdfDoc.text(details.category, pageWidth - margin - 18, y, {
        align: "right",
      });
      y += 20;
      pdfDoc.setFont("times", "normal");
      pdfDoc.text("Items Donated:", margin + 18, y);
      y += 18;
      pdfDoc.setFontSize(10);
      const wrapped = pdfDoc.splitTextToSize(
        details.description,
        pageWidth - margin * 2 - 36,
      );
      pdfDoc.text(wrapped, margin + 18, y);
    }

    y = boxTop + boxHeight + 50;

    // ── Thank-you note ──
    pdfDoc.setFont("times", "italic");
    pdfDoc.setFontSize(12);
    pdfDoc.setTextColor(71, 85, 105);
    const thanksLines = pdfDoc.splitTextToSize(
      "Your generosity directly transforms the lives of vulnerable children in our care. On behalf of every child we support, thank you for believing in our mission.",
      pageWidth - margin * 2,
    );
    pdfDoc.text(thanksLines, margin, y);

    // ── Footer ──
    pdfDoc.setDrawColor(226, 232, 240);
    pdfDoc.line(margin, 740, pageWidth - margin, 740);
    pdfDoc.setFont("times", "normal");
    pdfDoc.setFontSize(9);
    pdfDoc.setTextColor(148, 163, 184);
    pdfDoc.text(
      "This is a system-generated receipt and does not require a physical signature.",
      margin,
      758,
    );
    pdfDoc.text(
      "Hope Home Foundation is a registered non-profit organisation.",
      margin,
      772,
    );

    return { pdfDoc, receiptNo };
  };

  // ── 8. Send Receipt: generate PDF → upload to Storage → trigger email Function ──
  const sendReceipt = async (
    collectionName,
    donorId,
    docId,
    name,
    email,
    details,
    type,
    createdAt,
  ) => {
    if (!email || email === "—") {
      alert("This donor has no email on file — cannot send a receipt.");
      return;
    }

    setSendingReceiptId(docId);
    try {
      // 1. Build PDF in-browser (same as before, now styled professionally)
      const { pdfDoc } = buildReceiptPdf(
        donorId,
        name,
        email,
        details,
        type,
        createdAt,
      );
      const pdfBlob = pdfDoc.output("blob");

      // 2. Upload to Firebase Storage
      const safeName = name.replace(/\s+/g, "_");
      const path = `receipts/${docId}_${Date.now()}_${safeName}.pdf`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, pdfBlob, { contentType: "application/pdf" });
      const pdfUrl = await getDownloadURL(fileRef);

      // 3. Write to mail_requests — Cloud Function listens here and emails it
      await addDoc(collection(db, "mail_requests"), {
        donorEmail: email,
        donorName: name,
        pdfUrl,
        type,
        amount: type === "money" ? details.amount : null,
        transactionId: type === "money" ? details.transactionId : null,
        category: type === "items" ? details.category : null,
        description: type === "items" ? details.description : null,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 4. Mark this donation record so the UI shows it was sent
      await updateDoc(doc(db, collectionName, docId), {
        receiptStatus: "sent",
        receiptSentAt: serverTimestamp(),
      });

      alert(`Receipt is being emailed to ${email}.`);
    } catch (err) {
      console.error("Send receipt error:", err);
      alert(
        "Failed to send receipt. Please check Storage/Firestore rules and try again.",
      );
    } finally {
      setSendingReceiptId(null);
    }
  };

  const markPickupComplete = async (item) => {
    try {
      await updateDoc(doc(db, "donations", item.docId), {
        status: "picked",
        pickedAt: serverTimestamp(),
        pickedByVolunteerId: item.assignedVolunteerId || "",
        updatedAt: serverTimestamp(),
      });
      alert("Pickup completed and the delivery proof step is now ready.");
    } catch (err) {
      console.error("Pickup update error:", err);
      alert("Failed to update pickup status.");
    }
  };

  const openDeliveryModal = (item) => {
    setDeliveryModal({ open: true, donation: item });
    setDeliveryProofFile(null);
    setDeliveryPreviewUrl(null);
    setDeliveryNotes(item.deliveryNotes ?? "");
    setZoomLevel(1);
  };

  const closeDeliveryModal = () => {
    if (deliveryPreviewUrl) {
      URL.revokeObjectURL(deliveryPreviewUrl);
    }
    setDeliveryModal({ open: false, donation: null });
    setDeliveryProofFile(null);
    setDeliveryPreviewUrl(null);
    setDeliveryNotes("");
    setUploadingDeliveryProof(false);
    setZoomLevel(1);
  };

  const handleDeliveryProofSelection = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (deliveryPreviewUrl) {
      URL.revokeObjectURL(deliveryPreviewUrl);
    }
    setDeliveryProofFile(selectedFile);
    setDeliveryPreviewUrl(
      selectedFile ? URL.createObjectURL(selectedFile) : null,
    );
  };

  const handleDeliveryProofSubmit = async (e) => {
    e.preventDefault();
    if (!deliveryModal.donation || !deliveryProofFile) {
      alert("Please select a delivery proof image before submitting.");
      return;
    }

    setUploadingDeliveryProof(true);
    try {
      const donationId = deliveryModal.donation.docId;
      const path = `delivery_proofs/${donationId}/${Date.now()}_${deliveryProofFile.name.replace(/\s+/g, "_")}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, deliveryProofFile, {
        contentType: deliveryProofFile.type || "image/jpeg",
      });
      const deliveryProofImageUrl = await getDownloadURL(fileRef);

      await updateDoc(doc(db, "donations", donationId), {
        deliveryProofImageUrl,
        deliveryUploadedAt: serverTimestamp(),
        deliveryNotes: deliveryNotes.trim(),
        status: "delivery_uploaded",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "mail_requests"), {
        donorEmail: deliveryModal.donation.email,
        donorName: deliveryModal.donation.name,
        donationId,
        type: "items",
        pickupImageUrl: deliveryModal.donation.proofImageUrl || "",
        deliveryProofImageUrl,
        deliveryNotes: deliveryNotes.trim(),
        status: "delivery_proof_uploaded",
        createdAt: serverTimestamp(),
      });

      closeDeliveryModal();
      alert("Delivery proof uploaded successfully!");
    } catch (err) {
      console.error("Delivery proof upload error:", err);
      alert(`Failed to upload delivery proof. ${err?.message || "Please try again."}`);
    } finally {
      setUploadingDeliveryProof(false);
    }
  };

  const markDonationDelivered = async (item) => {
    if (!item.proofImageUrl || !item.deliveryProofImageUrl) {
      alert(
        "Both pickup and delivery proof images are required before marking the donation as delivered.",
      );
      return;
    }

    try {
      await updateDoc(doc(db, "donations", item.docId), {
        status: "delivered",
        deliveredAt: serverTimestamp(),
        deliveredByVolunteerId:
          item.assignedVolunteerId || item.pickedByVolunteerId || "",
        notifyDonor: true,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "users", item.id, "notifications"), {
        title: "Donation Delivered Successfully",
        body: "Your donation has reached the orphanage.",
        donationId: item.docId,
        pickupImageUrl: item.proofImageUrl || "",
        deliveryProofImageUrl: item.deliveryProofImageUrl || "",
        createdAt: serverTimestamp(),
        isRead: false,
      });

      alert("Donation marked as delivered and donor notification queued.");
    } catch (err) {
      console.error("Delivery confirmation error:", err);
      alert("Failed to mark donation as delivered.");
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { background: "#fef3c7", color: "#92400e" },
      approved: { background: "#dcfce7", color: "#166534" },
      verified: { background: "#dcfce7", color: "#166534" },
      rejected: { background: "#fee2e2", color: "#b91c1c" },
      assigned: { background: "#dbeafe", color: "#1d4ed8" },
      picked: { background: "#e0f2fe", color: "#0369a1" },
      delivery_uploaded: { background: "#ede9fe", color: "#6d28d9" },
      delivered: { background: "#dcfce7", color: "#166534" },
    };
    const s = map[status] ?? { background: "#e2e3e5", color: "#383d41" };
    return {
      ...s,
      padding: "4px 10px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      display: "inline-block",
      textTransform: "uppercase",
    };
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
      />

      <div style={styles.pageContainer}>
        {/* Toggle Custom Navigation Controls Bar */}
        <div style={styles.tabBarContainer}>
          <button
            style={{
              ...styles.tabBtn,
              borderBottom:
                activeTab === "money"
                  ? "3px solid #3683F0"
                  : "3px solid transparent",
              color: activeTab === "money" ? "#3683F0" : "#64748B",
            }}
            onClick={() => {
              setActiveTab("money");
              setLoading(true);
            }}
          >
            <i className="fa-solid fa-money-bill-transfer"></i> Money Donations
            Verification
          </button>
          <button
            style={{
              ...styles.tabBtn,
              borderBottom:
                activeTab === "items"
                  ? "3px solid #3683F0"
                  : "3px solid transparent",
              color: activeTab === "items" ? "#3683F0" : "#64748B",
            }}
            onClick={() => {
              setActiveTab("items");
              setLoading(true);
            }}
          >
            <i className="fa-solid fa-boxes-stacked"></i> Item Resource Pickups
          </button>
        </div>

        <div style={styles.donorsCard}>
          <div style={styles.donorsCardHeader}>
            <span style={styles.headerSpan}>
              <i
                className={
                  activeTab === "money" ? "fa fa-wallet" : "fa fa-boxes-packing"
                }
              ></i>
              {activeTab === "money"
                ? " Financial Settlement Operations"
                : " Material Allocation Audits"}
            </span>
            <button style={styles.exportBtn} onClick={exportTableToExcel}>
              <i className="fa fa-file-excel"></i> Export Active List
            </button>
          </div>

          <div style={styles.donorsCardBody}>
            {loading ? (
              <p
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <i className="fa fa-spinner fa-spin"></i> Loading tracking
                matrices...
              </p>
            ) : activeTab === "money" ? (
              /* ================= MONEY OPERATIONS TABLES RENDERING ================= */
              moneyData.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                  }}
                >
                  No financial records logs found.
                </p>
              ) : (
                <table style={styles.donorsTable}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>ID Ref</th>
                      <th style={styles.tableHeader}>Donor Benefactor</th>
                      <th style={styles.tableHeader}>Email Account</th>
                      <th style={styles.tableHeader}>Settlement Ledger</th>
                      <th style={styles.tableHeader}>Gateway Audit Code</th>
                      <th style={styles.tableHeader}>Verification Actions</th>
                      <th style={styles.tableHeader}>Receipts Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moneyData.map((donor, idx) => (
                      <tr
                        key={donor.docId}
                        style={
                          idx % 2 === 1 ? styles.tableRowEven : styles.tableRow
                        }
                      >
                        <td
                          style={styles.tableCell}
                        >{`FIN-${String(idx + 1).padStart(3, "0")}`}</td>
                        <td style={styles.tableCell}>
                          <span style={{ fontWeight: "500" }}>
                            {donor.name}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{donor.email}</td>
                        <td
                          style={{
                            ...styles.tableCell,
                            color: "#16a34a",
                            fontWeight: "600",
                          }}
                        >
                          ₹{donor.amount.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            ...styles.tableCell,
                            fontFamily: "monospace",
                          }}
                        >
                          {donor.transactionId}
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{ marginBottom: "8px" }}>
                            <span style={statusBadge(donor.status)}>
                              {donor.status}
                            </span>
                          </div>
                          {donor.status === "pending" && (
                            <div style={styles.actionRow}>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: "#28a745",
                                }}
                                onClick={() =>
                                  updateStatus(
                                    "money_donations",
                                    donor.docId,
                                    "verified",
                                  )
                                }
                              >
                                <i className="fa fa-check"></i> Verify
                                Settlement
                              </button>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: "#dc3545",
                                }}
                                onClick={() =>
                                  updateStatus(
                                    "money_donations",
                                    donor.docId,
                                    "rejected",
                                  )
                                }
                              >
                                <i className="fa fa-ban"></i> Deny
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          <button
                            style={{
                              ...styles.downloadBtn,
                              opacity: donor.status === "verified" ? 1 : 0.4,
                              cursor:
                                donor.status === "verified"
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                            disabled={
                              donor.status !== "verified" ||
                              sendingReceiptId === donor.docId
                            }
                            onClick={() =>
                              sendReceipt(
                                "money_donations",
                                donor.id,
                                donor.docId,
                                donor.name,
                                donor.email,
                                {
                                  amount: donor.amount,
                                  transactionId: donor.transactionId,
                                },
                                "money",
                                donor.createdAt,
                              )
                            }
                          >
                            {sendingReceiptId === donor.docId ? (
                              <>
                                <i className="fa fa-spinner fa-spin"></i>{" "}
                                Sending...
                              </>
                            ) : donor.receiptStatus === "sent" ? (
                              <>
                                <i className="fa fa-check"></i> Resend Receipt
                              </>
                            ) : (
                              <>
                                <i className="fa fa-paper-plane"></i> Send
                                Receipt
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : /* ================= MATERIAL SUPPLIES TABLE RENDERING ================= */
            itemsData.length === 0 ? (
              <p
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                No logistical requirements entries tracked.
              </p>
            ) : (
              <table style={styles.donorsTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>ID Ref</th>
                    <th style={styles.tableHeader}>Supporter Name</th>
                    <th style={styles.tableHeader}>Resource Category</th>
                    <th style={styles.tableHeader}>
                      Inventory Items Breakdown
                    </th>
                    <th style={styles.tableHeader}>Collection Location Pin</th>
                    <th style={styles.tableHeader}>Pickup Proof</th>
                    <th style={styles.tableHeader}>Delivery Proof</th>
                    <th style={styles.tableHeader}>Logistics & Status</th>
                    <th style={styles.tableHeader}>Manifest Acknowledgement</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsData.map((item, idx) => (
                    <tr
                      key={item.docId}
                      style={
                        idx % 2 === 1 ? styles.tableRowEven : styles.tableRow
                      }
                    >
                      <td
                        style={styles.tableCell}
                      >{`ITM-${String(idx + 1).padStart(3, "0")}`}</td>
                      <td style={styles.tableCell}>{item.name}</td>
                      <td style={styles.tableCell}>
                        <span style={styles.categoryPill}>{item.category}</span>
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: "left" }}>
                        {item.itemDescription}
                      </td>
                      <td
                        style={{
                          ...styles.tableCell,
                          fontSize: "12px",
                          color: "#64748B",
                        }}
                      >
                        {item.pickupLocation}
                      </td>
                      <td style={styles.tableCell}>
                        {item.proofImageUrl ? (
                          <button
                            style={styles.imageButton}
                            onClick={() =>
                              setPreviewImage({
                                url: item.proofImageUrl,
                                label: "Pickup Proof",
                              })
                            }
                          >
                            <img
                              src={item.proofImageUrl}
                              alt="Pickup proof"
                              style={styles.thumbnailImage}
                            />
                          </button>
                        ) : (
                          <span style={styles.emptyProofText}>
                            Awaiting Pickup
                          </span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        {item.deliveryProofImageUrl ? (
                          <button
                            style={styles.imageButton}
                            onClick={() =>
                              setPreviewImage({
                                url: item.deliveryProofImageUrl,
                                label: "Delivery Proof",
                              })
                            }
                          >
                            <img
                              src={item.deliveryProofImageUrl}
                              alt="Delivery proof"
                              style={styles.thumbnailImage}
                            />
                          </button>
                        ) : (
                          <span style={styles.emptyProofText}>
                            Pending Delivery
                          </span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ marginBottom: "8px" }}>
                          <span style={statusBadge(item.status)}>
                            {item.status === "assigned"
                              ? `🚚 Moving: ${item.assignedVolunteer}`
                              : item.status}
                          </span>
                        </div>
                        <div style={styles.actionRow}>
                          {item.status === "pending" && (
                            <>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: "#28a745",
                                }}
                                onClick={() =>
                                  updateStatus(
                                    "donations",
                                    item.docId,
                                    "approved",
                                  )
                                }
                              >
                                <i className="fa fa-thumbs-up"></i> Approve
                                Request
                              </button>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: "#dc3545",
                                }}
                                onClick={() =>
                                  updateStatus(
                                    "donations",
                                    item.docId,
                                    "rejected",
                                  )
                                }
                              >
                                <i className="fa fa-times"></i> Dismiss
                              </button>
                            </>
                          )}
                          {item.status === "approved" && (
                            <div
                              style={{
                                position: "relative",
                                display: "inline-block",
                              }}
                            >
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: "#6f42c1",
                                }}
                                onClick={() =>
                                  setAssigningId(
                                    assigningId === item.docId
                                      ? null
                                      : item.docId,
                                  )
                                }
                              >
                                <i className="fa fa-truck-ramp-box"></i> Assign
                                Logistics
                              </button>
                              {assigningId === item.docId && (
                                <div style={styles.volunteerDropdown}>
                                  {volunteers.length === 0 ? (
                                    <div style={styles.volunteerOption}>
                                      No available fleet couriers
                                    </div>
                                  ) : (
                                    volunteers.map((v) => (
                                      <div
                                        key={v.id}
                                        style={styles.volunteerOption}
                                        onClick={() =>
                                          assignVolunteer(item.docId, v)
                                        }
                                      >
                                        {v.name}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {item.status === "assigned" && (
                            <button
                              style={{
                                ...styles.actionBtn,
                                background: "#0f766e",
                              }}
                              onClick={() => markPickupComplete(item)}
                            >
                              <i className="fa-solid fa-circle-check"></i> Mark
                              Pickup Complete
                            </button>
                          )}
                          {(item.status === "picked" ||
                            item.status === "delivery_uploaded") && (
                            <button
                              style={{
                                ...styles.actionBtn,
                                background:
                                  item.status === "picked"
                                    ? "#7c3aed"
                                    : "#16a34a",
                                opacity:
                                  item.status === "picked"
                                    ? 1
                                    : !item.proofImageUrl ||
                                        !item.deliveryProofImageUrl
                                      ? 0.55
                                      : 1,
                              }}
                              disabled={
                                item.status === "delivery_uploaded" &&
                                (!item.proofImageUrl ||
                                  !item.deliveryProofImageUrl)
                              }
                              onClick={() =>
                                item.status === "picked"
                                  ? openDeliveryModal(item)
                                  : markDonationDelivered(item)
                              }
                            >
                              <i className="fa-solid fa-truck-fast"></i>{" "}
                              {item.status === "picked"
                                ? "Mark As Delivered"
                                : "Mark Delivered"}
                            </button>
                          )}
                          {item.status === "delivered" && (
                            <button
                              style={{
                                ...styles.actionBtn,
                                background: "#15803d",
                              }}
                              onClick={() =>
                                window.open(
                                  `/donor-tracking/${item.docId}`,
                                  "_blank",
                                )
                              }
                            >
                              Track Donation
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          style={{
                            ...styles.downloadBtn,
                            background: "#14B8A6",
                          }}
                          disabled={sendingReceiptId === item.docId}
                          onClick={() =>
                            sendReceipt(
                              "donations",
                              item.id,
                              item.docId,
                              item.name,
                              item.email,
                              {
                                category: item.category,
                                description: item.itemDescription,
                              },
                              "items",
                              item.createdAt,
                            )
                          }
                        >
                          {sendingReceiptId === item.docId ? (
                            <>
                              <i className="fa fa-spinner fa-spin"></i>{" "}
                              Sending...
                            </>
                          ) : item.receiptStatus === "sent" ? (
                            <>
                              <i className="fa fa-check"></i> Resend
                              Acknowledgement
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-paper-plane"></i> Send
                              Acknowledgement
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          style={styles.previewOverlay}
          onClick={() => setPreviewImage(null)}
        >
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>{previewImage.label}</span>
              <div style={styles.previewActions}>
                <button
                  style={styles.zoomButton}
                  onClick={() =>
                    setZoomLevel((prev) => Math.max(1, prev - 0.25))
                  }
                >
                  -
                </button>
                <span
                  style={{
                    fontWeight: 600,
                    minWidth: "48px",
                    textAlign: "center",
                  }}
                >
                  {zoomLevel.toFixed(2)}x
                </span>
                <button
                  style={styles.zoomButton}
                  onClick={() => setZoomLevel((prev) => prev + 0.25)}
                >
                  +
                </button>
                <button
                  style={styles.closePreviewButton}
                  onClick={() => setPreviewImage(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={styles.previewBody}>
              <img
                src={previewImage.url}
                alt={previewImage.label}
                style={{
                  ...styles.previewImage,
                  transform: `scale(${zoomLevel})`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {deliveryModal.open && deliveryModal.donation && (
        <div style={styles.previewOverlay} onClick={closeDeliveryModal}>
          <div
            style={styles.deliveryModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>Upload Delivery Proof</span>
              <button
                style={styles.closePreviewButton}
                onClick={closeDeliveryModal}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleDeliveryProofSubmit}
              style={styles.deliveryForm}
            >
              <label style={styles.uploadLabel}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDeliveryProofSelection}
                  style={styles.fileInput}
                />
                <span style={styles.uploadText}>
                  Choose delivery proof image
                </span>
              </label>
              {deliveryPreviewUrl && (
                <div style={styles.previewBox}>
                  <img
                    src={deliveryPreviewUrl}
                    alt="Selected delivery proof"
                    style={styles.selectedPreviewImage}
                  />
                </div>
              )}
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Optional delivery notes"
                style={styles.notesInput}
                rows={4}
              />
              <button
                type="submit"
                style={styles.submitDeliveryButton}
                disabled={uploadingDeliveryProof}
              >
                {uploadingDeliveryProof
                  ? "Uploading..."
                  : "Submit Delivery Proof"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  pageContainer: {
    padding: "40px 30px",
    width: "100%",
    minHeight: "100vh",
    background: "#F8FAFC",
    fontFamily: "'Poppins', Arial, sans-serif",
    boxSizing: "border-box",
  },
  tabBarContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "24px",
    borderBottom: "1px solid #E2E8F0",
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "12px 6px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  donorsCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
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
  exportBtn: {
    background: "#10B981",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  donorsCardBody: {
    padding: "20px",
    overflowX: "auto",
  },
  donorsTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
    minWidth: "950px",
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
  downloadBtn: {
    background: "#3683F0",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  actionRow: {
    display: "flex",
    gap: "6px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  actionBtn: {
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  categoryPill: {
    background: "#F1F5F9",
    color: "#475569",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
  },
  imageButton: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  thumbnailImage: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "10px",
    border: "1px solid #E2E8F0",
  },
  emptyProofText: {
    color: "#94a3b8",
    fontSize: "12px",
    fontStyle: "italic",
  },
  previewOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  previewModal: {
    width: "min(92vw, 760px)",
    background: "white",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
  },
  deliveryModal: {
    width: "min(92vw, 520px)",
    background: "white",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  previewTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  previewActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  zoomButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: "6px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
  },
  closePreviewButton: {
    border: "none",
    background: "#ef4444",
    color: "white",
    borderRadius: "999px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    fontSize: "18px",
  },
  previewBody: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    maxHeight: "72vh",
    overflow: "auto",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "12px",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "68vh",
    objectFit: "contain",
    transition: "transform 0.2s ease",
  },
  deliveryForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  uploadLabel: {
    border: "2px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    background: "#f8fafc",
  },
  fileInput: {
    display: "none",
  },
  uploadText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  previewBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedPreviewImage: {
    maxWidth: "100%",
    maxHeight: "220px",
    objectFit: "contain",
    borderRadius: "10px",
  },
  notesInput: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px",
    resize: "vertical",
    minHeight: "96px",
  },
  submitDeliveryButton: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#7c3aed",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
  volunteerDropdown: {
    position: "absolute",
    top: "110%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 999,
    minWidth: "160px",
  },
  volunteerOption: {
    padding: "10px 14px",
    fontSize: "12px",
    color: "#334155",
    cursor: "pointer",
    textAlign: "left",
    background: "white",
    borderBottom: "1px solid #F1F5F9",
  },
};

export default Donors;
