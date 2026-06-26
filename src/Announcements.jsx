import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase/firebase.js";

const DEFAULT_CARDS = [
  {
    id: "food",
    title: "Food & Grains",
    category: "Food",
    description:
      "Rice, wheat, lentils and essential food grains to nourish children daily.",
    requiredQuantity: 100,
    urgency: "High",
    imageUrl:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
    icon: "🌾",
  },
  {
    id: "clothes",
    title: "Clothes & Uniforms",
    category: "Clothes",
    description:
      "Seasonal clothing, school uniforms and footwear for growing children.",
    requiredQuantity: 60,
    urgency: "Medium",
    imageUrl:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80",
    icon: "👕",
  },
  {
    id: "books",
    title: "Books & Education",
    category: "Education",
    description:
      "Textbooks, notebooks and learning materials to support academic growth.",
    requiredQuantity: 80,
    urgency: "Medium",
    imageUrl:
      "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=400&q=80",
    icon: "📚",
  },
  {
    id: "medical",
    title: "Medical Supplies",
    category: "Healthcare",
    description:
      "First aid kits, medicines and hygiene products to keep children healthy.",
    requiredQuantity: 40,
    urgency: "High",
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
    icon: "💊",
  },
  {
    id: "essentials",
    title: "Daily Essentials",
    category: "Daily Essentials",
    description:
      "Soap, toothpaste, shampoo and everyday hygiene items for all children.",
    requiredQuantity: 120,
    urgency: "Low",
    imageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
    icon: "🧴",
  },
  {
    id: "furniture",
    title: "Furniture",
    category: "Furniture",
    description:
      "Beds, study tables and chairs to create a comfortable living space.",
    requiredQuantity: 20,
    urgency: "Low",
    imageUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    icon: "🪑",
  },
  {
    id: "electronics",
    title: "Electronics",
    category: "Electronics",
    description:
      "Tablets, computers and learning devices to bridge the digital divide.",
    requiredQuantity: 15,
    urgency: "Medium",
    imageUrl:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80",
    icon: "💻",
  },
  {
    id: "stationery",
    title: "Stationery",
    category: "Stationery",
    description:
      "Pens, pencils, colors and art supplies to spark creativity in children.",
    requiredQuantity: 200,
    urgency: "Low",
    imageUrl:
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80",
    icon: "✏️",
  },
];

const CATEGORY_ICONS = {
  Food: "🌾",
  Clothes: "👕",
  Education: "📚",
  Healthcare: "💊",
  "Daily Essentials": "🧴",
  Furniture: "🪑",
  Electronics: "💻",
  Stationery: "✏️",
  Other: "📦",
};

const CATEGORY_IMAGES = {
  Food: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  Clothes:
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80",
  Education:
    "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=400&q=80",
  Healthcare:
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
  "Daily Essentials":
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
  Furniture:
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
  Electronics:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80",
  Stationery:
    "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80",
  Other:
    "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80",
};

const URGENCY_STYLES = {
  Low: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  Medium: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  High: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

const CATEGORIES = [
  "Food",
  "Clothes",
  "Education",
  "Healthcare",
  "Daily Essentials",
  "Furniture",
  "Electronics",
  "Stationery",
  "Other",
];

const emptyForm = {
  title: "",
  category: "Other",
  description: "",
  requiredQuantity: "",
  urgency: "Medium",
};

export default function Announcements() {
  const [cards, setCards] = useState(DEFAULT_CARDS); // all cards including custom
  const [published, setPublished] = useState({}); // { cardId: firestoreDocId }
  const [publishing, setPublishing] = useState({});
  const [received, setReceived] = useState({}); // { cardId: number }
  const [quickAdd, setQuickAdd] = useState({}); // { cardId: string (input value) }
  const [updatingQty, setUpdatingQty] = useState({}); // { cardId: bool }
  const [deleting, setDeleting] = useState({}); // { cardId: bool }
  const [confirmDelete, setConfirmDelete] = useState(null); // cardId pending confirm
  const [manageCardId, setManageCardId] = useState(null); // cardId with modal open
  const [manageAmount, setManageAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState(emptyForm);
  const [customSaving, setCustomSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const nextPublished = {};
        const nextReceived = {};
        const liveCards = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const title = data.title ?? "Untitled";
          const category = data.category ?? "Other";
          const matchingTemplate = DEFAULT_CARDS.find(
            (card) => card.title === title && card.category === category,
          );
          const cardId = matchingTemplate
            ? matchingTemplate.id
            : `announcement_${docSnap.id}`;

          const card = matchingTemplate
            ? { ...matchingTemplate }
            : {
                id: cardId,
                title,
                category,
                description: data.description ?? "",
                requiredQuantity: Number(data.requiredQuantity ?? 0),
                urgency: data.urgency ?? "Medium",
                imageUrl:
                  data.imageUrl ||
                  CATEGORY_IMAGES[category] ||
                  CATEGORY_IMAGES["Other"],
                icon: CATEGORY_ICONS[category] || "📦",
                isCustom: true,
                firestoreId: docSnap.id,
                isLiveAnnouncement: true,
              };

          nextPublished[cardId] = docSnap.id;
          nextReceived[cardId] = Number(data.receivedQuantity ?? 0);

          if (!liveCards.some((item) => item.id === card.id)) {
            liveCards.push(card);
          }
        });

        setPublished(nextPublished);
        setReceived(nextReceived);

        setCards((prevCards) => {
          const baseCards = DEFAULT_CARDS.map((card) => ({ ...card }));
          const keptCustomCards = prevCards.filter((card) => {
            if (card.isCustom || card.isLiveAnnouncement) {
              return liveCards.some(
                (liveCard) =>
                  liveCard.id === card.id ||
                  liveCard.firestoreId === card.firestoreId,
              );
            }
            return false;
          });

          const mergedCards = [...baseCards];
          const seenIds = new Set(baseCards.map((card) => card.id));

          keptCustomCards.forEach((card) => {
            if (!seenIds.has(card.id)) {
              mergedCards.push(card);
              seenIds.add(card.id);
            }
          });

          liveCards.forEach((card) => {
            if (!seenIds.has(card.id)) {
              mergedCards.push(card);
              seenIds.add(card.id);
            }
          });

          return mergedCards;
        });
      },
      (error) => {
        console.error("Announcements sync error:", error);
        showToast("Could not sync with Firestore. Please refresh.", "error");
      },
    );

    return () => unsubscribe();
  }, []);

  // ── Publish a default/template card ──
  const publishCard = async (card) => {
    setPublishing((p) => ({ ...p, [card.id]: true }));
    try {
      const docRef = await addDoc(collection(db, "announcements"), {
        title: card.title,
        category: card.category,
        description: card.description,
        requiredQuantity: card.requiredQuantity,
        receivedQuantity: 0,
        urgency: card.urgency,
        imageUrl: card.imageUrl || "",
        status: "open",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        title: "📢 New Donation Request",

        body: `${card.title} needs ${card.requiredQuantity} items`,

        announcementId: docRef.id,

        category: card.category,

        urgency: card.urgency,

        createdAt: serverTimestamp(),
      });
      setPublished((p) => ({ ...p, [card.id]: docRef.id }));
      setReceived((r) => ({ ...r, [card.id]: 0 }));
      showToast(`"${card.title}" published to donor feed!`);
    } catch {
      showToast("Failed to publish. Check Firestore rules.", "error");
    } finally {
      setPublishing((p) => ({ ...p, [card.id]: false }));
    }
  };

  // ── Publish the custom card from modal ──
  const publishCustom = async () => {
    if (
      !customForm.title.trim() ||
      !customForm.description.trim() ||
      !customForm.requiredQuantity
    ) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    setCustomSaving(true);

    const newCard = {
      id: `custom_${Date.now()}`,
      title: customForm.title.trim(),
      category: customForm.category,
      description: customForm.description.trim(),
      requiredQuantity: Number(customForm.requiredQuantity),
      urgency: customForm.urgency,
      imageUrl:
        CATEGORY_IMAGES[customForm.category] || CATEGORY_IMAGES["Other"],
      icon: CATEGORY_ICONS[customForm.category] || "📦",
      isCustom: true,
    };

    try {
      const docRef = await addDoc(collection(db, "announcements"), {
        title: newCard.title,
        category: newCard.category,
        description: newCard.description,
        requiredQuantity: newCard.requiredQuantity,
        receivedQuantity: 0,
        urgency: newCard.urgency,
        imageUrl: newCard.imageUrl,
        status: "open",
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        title: "📢 New Donation Request",
        body: `${newCard.title} needs ${newCard.requiredQuantity} items`,
        announcementId: docRef.id,
        category: newCard.category,
        urgency: newCard.urgency,
        createdAt: serverTimestamp(),
      });

      // Add card to grid AND mark it as published immediately
      setCards((prev) => [...prev, newCard]);
      setPublished((p) => ({ ...p, [newCard.id]: docRef.id }));
      setReceived((r) => ({ ...r, [newCard.id]: 0 }));

      showToast(`"${newCard.title}" added to grid & published!`);
      setShowCustom(false);
      setCustomForm(emptyForm);
    } catch {
      showToast("Failed to publish. Check Firestore rules.", "error");
    } finally {
      setCustomSaving(false);
    }
  };

  // ── Core: add a received amount, persist to Firestore, auto-delete if fulfilled ──
  const addReceived = async (card, amountRaw) => {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) {
      showToast("Enter a valid quantity.", "error");
      return;
    }

    const firestoreId = published[card.id];
    if (!firestoreId) return;

    const current = received[card.id] || 0;
    const updated = current + amount;
    const isFulfilled = updated >= card.requiredQuantity;

    setUpdatingQty((u) => ({ ...u, [card.id]: true }));
    try {
      if (isFulfilled) {
        // Required quantity met or exceeded — remove from Firestore entirely,
        // which removes it from both admin and donor views.
        await deleteDoc(doc(db, "announcements", firestoreId));

        setCards((prev) => prev.filter((c) => c.id !== card.id));
        setPublished((p) => {
          const next = { ...p };
          delete next[card.id];
          return next;
        });
        setReceived((r) => {
          const next = { ...r };
          delete next[card.id];
          return next;
        });
        showToast(
          `"${card.title}" fulfilled (${updated}/${card.requiredQuantity}) — removed from feed!`,
        );
        setManageCardId(null);
        setManageAmount("");
      } else {
        await updateDoc(doc(db, "announcements", firestoreId), {
          receivedQuantity: updated,
        });
        setReceived((r) => ({ ...r, [card.id]: updated }));
        showToast(
          `Added ${amount} to "${card.title}". ${updated}/${card.requiredQuantity} received.`,
        );
        setManageAmount("");
      }
      setQuickAdd((q) => ({ ...q, [card.id]: "" }));
    } catch {
      showToast("Failed to update quantity. Check Firestore rules.", "error");
    } finally {
      setUpdatingQty((u) => ({ ...u, [card.id]: false }));
    }
  };

  // ── Delete an announcement outright ──
  const deleteCard = async (card) => {
    const firestoreId = published[card.id];
    setDeleting((d) => ({ ...d, [card.id]: true }));
    try {
      if (firestoreId) {
        await deleteDoc(doc(db, "announcements", firestoreId));
      }
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      setPublished((p) => {
        const next = { ...p };
        delete next[card.id];
        return next;
      });
      setReceived((r) => {
        const next = { ...r };
        delete next[card.id];
        return next;
      });
      showToast(`"${card.title}" deleted.`);
    } catch {
      showToast("Failed to delete. Check Firestore rules.", "error");
    } finally {
      setDeleting((d) => ({ ...d, [card.id]: false }));
      setConfirmDelete(null);
    }
  };

  const totalPublished = Object.keys(published).length;
  const manageCard = cards.find((c) => c.id === manageCardId);

  return (
    <>
      <style>{CSS}</style>

      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Admin Dashboard</p>
            <h1 className="page-title">Donation Announcements</h1>
            <p className="page-subtitle">
              Select a category and publish it to the donor feed instantly.
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-num">{totalPublished}</span>
              <span className="stat-lbl">Published</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">{cards.length + 1}</span>
              <span className="stat-lbl">Templates</span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid">
          {cards.map((card) => {
            const urg = URGENCY_STYLES[card.urgency];
            const done = !!published[card.id];
            const busy = publishing[card.id];
            const recv = received[card.id] || 0;
            const remaining = Math.max(card.requiredQuantity - recv, 0);
            const progressPct = Math.min(
              (recv / card.requiredQuantity) * 100,
              100,
            );
            const isDeleting = deleting[card.id];
            const isUpdating = updatingQty[card.id];

            return (
              <div
                key={card.id}
                className={`card ${done ? "card--done" : ""} ${card.isCustom ? "card--custom-published" : ""}`}
              >
                <div className="card-img-wrap">
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="card-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="card-img-overlay" />
                  <span className="card-icon">{card.icon}</span>
                  {card.isCustom && !done && (
                    <div className="card-custom-tag">Custom</div>
                  )}
                  {done && <div className="card-ribbon">✓ Published</div>}

                  {/* Delete icon — only once published, so there's a Firestore doc to remove */}
                  {done && (
                    <button
                      className="card-delete-btn"
                      title="Delete announcement"
                      onClick={() => setConfirmDelete(card.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <span className="spinner spinner--white spinner--xs" />
                      ) : (
                        "🗑"
                      )}
                    </button>
                  )}
                </div>

                <div className="card-body">
                  <div className="card-meta">
                    <span className="card-category">{card.category}</span>
                    <span
                      className="urgency-badge"
                      style={{ background: urg.bg, color: urg.color }}
                    >
                      <span
                        className="urgency-dot"
                        style={{ background: urg.dot }}
                      />
                      {card.urgency}
                    </span>
                  </div>

                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-desc">{card.description}</p>

                  <div className="card-qty">
                    <div className="qty-item">
                      <span className="qty-num">{card.requiredQuantity}</span>
                      <span className="qty-lbl">Required</span>
                    </div>
                    <div className="qty-divider" />
                    <div className="qty-item">
                      <span className="qty-num" style={{ color: "#10b981" }}>
                        {recv}
                      </span>
                      <span className="qty-lbl">Received</span>
                    </div>
                    <div className="qty-divider" />
                    <div className="qty-item">
                      <span className="qty-num" style={{ color: "#f59e0b" }}>
                        {remaining}
                      </span>
                      <span className="qty-lbl">Remaining</span>
                    </div>
                  </div>

                  {done && (
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}

                  {!done ? (
                    <button
                      className="publish-btn"
                      onClick={() => publishCard(card)}
                      disabled={busy}
                    >
                      {busy ? (
                        <span className="spinner" />
                      ) : (
                        "Publish Announcement"
                      )}
                    </button>
                  ) : (
                    <div className="receive-row">
                      <input
                        type="number"
                        min="1"
                        className="receive-input"
                        placeholder="Qty received"
                        value={quickAdd[card.id] || ""}
                        onChange={(e) =>
                          setQuickAdd((q) => ({
                            ...q,
                            [card.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            addReceived(card, quickAdd[card.id]);
                        }}
                      />
                      <button
                        className="receive-add-btn"
                        onClick={() => addReceived(card, quickAdd[card.id])}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <span className="spinner spinner--xs" />
                        ) : (
                          "Add"
                        )}
                      </button>
                      <button
                        className="receive-manage-btn"
                        onClick={() => {
                          setManageCardId(card.id);
                          setManageAmount("");
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Custom card trigger — always last */}
          <div
            className="card card--custom"
            onClick={() => setShowCustom(true)}
          >
            <div className="custom-inner">
              <div className="custom-plus">+</div>
              <h3 className="custom-title">Custom Announcement</h3>
              <p className="custom-desc">
                Write your own donation request with a personalised message for
                donors.
              </p>
              <span className="custom-cta">Create Custom →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Modal */}
      {showCustom && (
        <div className="modal-overlay" onClick={() => setShowCustom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Custom Announcement</h2>
              <button
                className="modal-close"
                onClick={() => setShowCustom(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="field">
                <label className="field-label">Title *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Winter Blankets Drive"
                  value={customForm.title}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, title: e.target.value })
                  }
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Category</label>
                  <select
                    className="field-input"
                    value={customForm.category}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Urgency</label>
                  <select
                    className="field-input"
                    value={customForm.urgency}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, urgency: e.target.value })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Description *</label>
                <textarea
                  className="field-input field-textarea"
                  rows={3}
                  placeholder="Describe what you need and why it matters..."
                  value={customForm.description}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="field-label">Required Quantity *</label>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={customForm.requiredQuantity}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      requiredQuantity: e.target.value,
                    })
                  }
                />
              </div>

              {/* Live Preview */}
              {customForm.title && (
                <div className="preview">
                  <p className="preview-label">Live Preview</p>
                  <div className="preview-card">
                    <div className="preview-top">
                      <img
                        src={
                          CATEGORY_IMAGES[customForm.category] ||
                          CATEGORY_IMAGES["Other"]
                        }
                        alt="preview"
                        className="preview-img"
                      />
                      <span className="preview-icon">
                        {CATEGORY_ICONS[customForm.category] || "📦"}
                      </span>
                    </div>
                    <div className="preview-body">
                      <div className="preview-row">
                        <span className="card-category">
                          {customForm.category}
                        </span>
                        <span
                          className="urgency-badge"
                          style={{
                            background: URGENCY_STYLES[customForm.urgency].bg,
                            color: URGENCY_STYLES[customForm.urgency].color,
                          }}
                        >
                          <span
                            className="urgency-dot"
                            style={{
                              background:
                                URGENCY_STYLES[customForm.urgency].dot,
                            }}
                          />
                          {customForm.urgency}
                        </span>
                      </div>
                      <p className="preview-title">{customForm.title}</p>
                      <p className="preview-desc">
                        {customForm.description || "No description yet."}
                      </p>
                      {customForm.requiredQuantity && (
                        <p className="preview-qty">
                          Qty needed: <b>{customForm.requiredQuantity}</b>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowCustom(false)}
              >
                Cancel
              </button>
              <button
                className="btn-publish"
                onClick={publishCustom}
                disabled={customSaving}
              >
                {customSaving ? (
                  <span className="spinner spinner--white" />
                ) : (
                  "Publish & Add to Grid"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Received Quantity Modal */}
      {manageCardId && manageCard && (
        <div className="modal-overlay" onClick={() => setManageCardId(null)}>
          <div
            className="modal modal--manage"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Manage Received Quantity</h2>
              <button
                className="modal-close"
                onClick={() => setManageCardId(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="manage-summary">
                <p className="manage-card-title">{manageCard.title}</p>
                <p className="manage-card-cat">{manageCard.category}</p>
              </div>

              <div className="card-qty card-qty--modal">
                <div className="qty-item">
                  <span className="qty-num">{manageCard.requiredQuantity}</span>
                  <span className="qty-lbl">Required</span>
                </div>
                <div className="qty-divider" />
                <div className="qty-item">
                  <span className="qty-num" style={{ color: "#10b981" }}>
                    {received[manageCardId] || 0}
                  </span>
                  <span className="qty-lbl">Received</span>
                </div>
                <div className="qty-divider" />
                <div className="qty-item">
                  <span className="qty-num" style={{ color: "#f59e0b" }}>
                    {Math.max(
                      manageCard.requiredQuantity -
                        (received[manageCardId] || 0),
                      0,
                    )}
                  </span>
                  <span className="qty-lbl">Remaining</span>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(((received[manageCardId] || 0) / manageCard.requiredQuantity) * 100, 100)}%`,
                  }}
                />
              </div>

              <div className="field">
                <label className="field-label">Add Received Quantity</label>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 25"
                  value={manageAmount}
                  onChange={(e) => setManageAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      addReceived(manageCard, manageAmount);
                  }}
                />
              </div>

              <p className="manage-hint">
                Reaching or exceeding the required quantity will automatically
                remove this announcement from both the admin dashboard and the
                donor feed.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setManageCardId(null)}
              >
                Close
              </button>
              <button
                className="btn-publish"
                onClick={() => addReceived(manageCard, manageAmount)}
                disabled={updatingQty[manageCardId]}
              >
                {updatingQty[manageCardId] ? (
                  <span className="spinner spinner--white" />
                ) : (
                  "Update Received"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal modal--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body modal-body--confirm">
              <div className="confirm-icon">🗑</div>
              <h2 className="confirm-title">Delete this announcement?</h2>
              <p className="confirm-text">
                This will permanently remove{" "}
                <b>{cards.find((c) => c.id === confirmDelete)?.title}</b> from
                Firestore, the admin dashboard, and the donor feed. This cannot
                be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={() =>
                  deleteCard(cards.find((c) => c.id === confirmDelete))
                }
                disabled={deleting[confirmDelete]}
              >
                {deleting[confirmDelete] ? (
                  <span className="spinner spinner--white" />
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .page {
    padding: 36px 32px;
    background: #f8f7f4;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 36px;
    flex-wrap: wrap;
    gap: 16px;
  }
  .page-eyebrow {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e87c3e;
    margin-bottom: 6px;
  }
  .page-title {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    color: #1a1a2e;
    line-height: 1.2;
  }
  .page-subtitle { font-size: 0.88rem; color: #6b7280; margin-top: 6px; }
  .header-stats { display: flex; gap: 12px; }
  .stat-pill {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 80px;
  }
  .stat-num { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
  .stat-lbl { font-size: 0.68rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(278px, 1fr));
    gap: 22px;
  }

  /* ── Card ── */
  .card {
    background: #fff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    border: 1px solid #f0ede8;
  }
  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 36px rgba(0,0,0,0.13);
  }
  .card--done { opacity: 1; }

  /* new custom card gets a subtle accent border */
  .card--custom-published {
    border: 1.5px solid #e87c3e33;
    animation: fadeInCard 0.4s ease;
  }
  @keyframes fadeInCard {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card-img-wrap {
    position: relative;
    height: 158px;
    overflow: hidden;
    background: #e8e4de;
    flex-shrink: 0;
  }
  .card-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
  .card:hover .card-img { transform: scale(1.05); }
  .card-img-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.32));
  }
  .card-icon {
    position: absolute; bottom: 10px; left: 14px;
    font-size: 1.6rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  .card-custom-tag {
    position: absolute; top: 10px; left: 10px;
    background: #e87c3e; color: #fff;
    font-size: 0.62rem; font-weight: 700;
    padding: 3px 9px; border-radius: 99px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .card-ribbon {
    position: absolute; top: 14px; right: -22px;
    background: #10b981; color: #fff;
    font-size: 0.65rem; font-weight: 700;
    padding: 4px 34px;
    transform: rotate(35deg);
    letter-spacing: 0.06em; white-space: nowrap;
  }
  .card-delete-btn {
    position: absolute; top: 10px; right: 10px;
    width: 26px; height: 26px;
    background: rgba(0,0,0,0.38);
    border: none; border-radius: 50%;
    color: #fff; font-size: 0.78rem;
    cursor: pointer; backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s, transform 0.15s;
    opacity: 0.85;
  }
  .card-delete-btn:hover:not(:disabled) { background: #ef4444; opacity: 1; transform: scale(1.08); }
  .card-delete-btn:disabled { cursor: default; opacity: 0.6; }

  .card-body {
    padding: 16px 17px 18px;
    display: flex; flex-direction: column; gap: 9px; flex: 1;
  }
  .card-meta { display: flex; justify-content: space-between; align-items: center; }
  .card-category {
    font-size: 0.67rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em; color: #e87c3e;
  }
  .urgency-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.68rem; font-weight: 600; padding: 3px 9px; border-radius: 99px;
  }
  .urgency-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .card-title { font-size: 0.98rem; font-weight: 700; color: #1a1a2e; line-height: 1.3; }
  .card-desc {
    font-size: 0.8rem; color: #6b7280; line-height: 1.6;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  .card-qty {
    display: flex; justify-content: space-around;
    background: #fafaf9; border-radius: 10px;
    padding: 9px 0; border: 1px solid #f0ede8;
  }
  .card-qty--modal { margin-top: 4px; }
  .qty-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .qty-num { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
  .qty-lbl { font-size: 0.6rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }
  .qty-divider { width: 1px; background: #e5e7eb; align-self: stretch; }

  .progress-track {
    width: 100%; height: 6px; border-radius: 99px;
    background: #f0ede8; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: 99px; transition: width 0.35s ease;
  }

  .publish-btn {
    width: 100%; padding: 11px;
    background: #1a1a2e; color: #fff; border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.84rem; font-weight: 600;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: auto;
  }
  .publish-btn:hover:not(:disabled) { background: #e87c3e; }

  /* ── Receive quantity inline row ── */
  .receive-row {
    display: flex; gap: 6px; margin-top: auto;
  }
  .receive-input {
    flex: 1; min-width: 0; padding: 9px 10px;
    border: 1.5px solid #e5e7eb; border-radius: 9px;
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #1a1a2e;
    background: #fafaf9; outline: none; transition: border-color 0.2s;
  }
  .receive-input:focus { border-color: #10b981; background: #fff; }
  .receive-add-btn {
    padding: 9px 14px; background: #10b981; color: #fff; border: none;
    border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
    font-weight: 600; cursor: pointer; transition: background 0.2s;
    display: flex; align-items: center; justify-content: center; min-width: 52px;
  }
  .receive-add-btn:hover:not(:disabled) { background: #059669; }
  .receive-add-btn:disabled { opacity: 0.7; cursor: default; }
  .receive-manage-btn {
    padding: 9px 12px; background: #f3f4f6; color: #374151; border: none;
    border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
    font-weight: 600; cursor: pointer; transition: background 0.2s; white-space: nowrap;
  }
  .receive-manage-btn:hover { background: #e5e7eb; }

  /* ── Custom trigger card ── */
  .card--custom {
    background: linear-gradient(135deg, #1a1a2e 0%, #2e2e50 100%);
    cursor: pointer; min-height: 320px;
    display: flex; align-items: center; justify-content: center;
    border: 2px dashed rgba(255,255,255,0.15);
  }
  .card--custom:hover { border-color: #e87c3e; transform: translateY(-5px); box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
  .custom-inner { text-align: center; padding: 32px 24px; }
  .custom-plus {
    width: 52px; height: 52px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; color: #e87c3e; margin: 0 auto 16px;
    transition: border-color 0.2s, transform 0.3s;
  }
  .card--custom:hover .custom-plus { border-color: #e87c3e; transform: rotate(90deg); }
  .custom-title { font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 10px; }
  .custom-desc { font-size: 0.8rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 18px; }
  .custom-cta { font-size: 0.82rem; font-weight: 600; color: #e87c3e; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(10,10,20,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; backdrop-filter: blur(4px);
  }
  .modal {
    background: #fff; border-radius: 20px;
    width: 100%; max-width: 520px; max-height: 90vh;
    display: flex; flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.22); overflow: hidden;
  }
  .modal--manage { max-width: 460px; }
  .modal--confirm { max-width: 400px; }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 22px 26px 0; flex-shrink: 0;
  }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #1a1a2e; }
  .modal-close {
    background: #f3f4f6; border: none; width: 30px; height: 30px;
    border-radius: 50%; font-size: 0.82rem; cursor: pointer; color: #6b7280;
    display: flex; align-items: center; justify-content: center;
  }
  .modal-body {
    padding: 18px 26px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 12px; flex: 1;
  }
  .modal-body--confirm { align-items: center; text-align: center; padding: 30px 26px 10px; }
  .modal-footer {
    padding: 14px 26px; border-top: 1px solid #f0ede8;
    display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
  }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-label { font-size: 0.74rem; font-weight: 600; color: #374151; }
  .field-input {
    padding: 10px 13px; border: 1.5px solid #e5e7eb; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.84rem; color: #1a1a2e;
    outline: none; transition: border-color 0.2s; background: #fafaf9; width: 100%;
  }
  .field-input:focus { border-color: #e87c3e; background: #fff; }
  .field-textarea { resize: vertical; min-height: 78px; }

  /* ── Manage modal extras ── */
  .manage-summary { display: flex; flex-direction: column; gap: 2px; }
  .manage-card-title { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
  .manage-card-cat {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #e87c3e;
  }
  .manage-hint { font-size: 0.74rem; color: #9ca3af; line-height: 1.5; }

  /* ── Confirm delete modal ── */
  .confirm-icon {
    width: 54px; height: 54px; border-radius: 50%;
    background: #fee2e2; color: #ef4444; font-size: 1.4rem;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 4px;
  }
  .confirm-title { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: #1a1a2e; }
  .confirm-text { font-size: 0.84rem; color: #6b7280; line-height: 1.6; }
  .btn-delete-confirm {
    padding: 10px 22px; background: #ef4444; color: #fff;
    border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
    font-size: 0.84rem; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 8px; transition: background 0.2s;
  }
  .btn-delete-confirm:hover:not(:disabled) { background: #dc2626; }

  /* ── Preview ── */
  .preview { background: #fafaf9; border-radius: 12px; border: 1px solid #f0ede8; overflow: hidden; }
  .preview-label {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #9ca3af; padding: 12px 14px 0;
  }
  .preview-card { overflow: hidden; }
  .preview-top {
    position: relative; height: 100px; overflow: hidden;
    background: #e8e4de; margin: 8px 14px 0; border-radius: 10px;
  }
  .preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .preview-icon {
    position: absolute; bottom: 8px; left: 10px; font-size: 1.3rem;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
  }
  .preview-body { padding: 10px 14px 14px; }
  .preview-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
  .preview-title { font-size: 0.9rem; font-weight: 700; color: #1a1a2e; margin-bottom: 3px; }
  .preview-desc { font-size: 0.76rem; color: #6b7280; line-height: 1.5; margin-bottom: 5px; }
  .preview-qty { font-size: 0.74rem; color: #6b7280; }
  .preview-qty b { color: #1a1a2e; }

  .btn-cancel {
    padding: 10px 20px; background: #f3f4f6; color: #374151;
    border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
    font-size: 0.84rem; font-weight: 600; cursor: pointer;
  }
  .btn-publish {
    padding: 10px 24px; background: #1a1a2e; color: #fff;
    border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
    font-size: 0.84rem; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 8px; transition: background 0.2s;
  }
  .btn-publish:hover:not(:disabled) { background: #e87c3e; }
  .btn-publish:disabled { opacity: 0.75; cursor: default; }

  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(0,0,0,0.12);
    border-top-color: #1a1a2e; border-radius: 50%;
    animation: spin 0.7s linear infinite; display: inline-block;
  }
  .spinner--white { border-color: rgba(255,255,255,0.25); border-top-color: #fff; }
  .spinner--xs { width: 12px; height: 12px; border-width: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .toast {
    position: fixed; bottom: 24px; right: 24px;
    color: #fff; padding: 13px 22px; border-radius: 12px;
    font-size: 0.84rem; font-weight: 500; z-index: 2000;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    font-family: 'DM Sans', sans-serif; animation: slideUp 0.3s ease;
    max-width: 360px;
  }
  .toast--success { background: #10b981; }
  .toast--error   { background: #ef4444; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  @media (max-width: 600px) {
    .page { padding: 20px 14px; }
    .page-title { font-size: 1.5rem; }
    .field-row { grid-template-columns: 1fr; }
    .header-stats { display: none; }
    .receive-row { flex-wrap: wrap; }
    .receive-manage-btn { flex: 1 1 100%; }
  }
`;
