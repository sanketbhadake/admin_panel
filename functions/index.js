const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const axios = require("axios");

admin.initializeApp();

const db = admin.firestore();

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

const toFcmData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );

const getTokens = (data = {}) => {
  const tokens = new Set();

  if (typeof data.fcmToken === "string" && data.fcmToken.trim()) {
    tokens.add(data.fcmToken.trim());
  }

  if (Array.isArray(data.fcmTokens)) {
    data.fcmTokens.forEach((token) => {
      if (typeof token === "string" && token.trim()) {
        tokens.add(token.trim());
      }
    });
  }

  return [...tokens];
};

const findRecipientDoc = async (recipientId) => {
  const collections = ["donors", "users", "volunteers"];
  for (const col of collections) {
    const ref = db.collection(col).doc(recipientId);
    const snap = await ref.get();
    if (snap.exists) return { ref, snapshot: snap };
  }
  return null;
};

const removeInvalidTokens = async (recipientRef, tokens, responses = []) => {
  const invalidTokens = [];

  responses.forEach((response, index) => {
    const code = response.error?.code;
    if (code && invalidTokenCodes.has(code)) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (!invalidTokens.length) return;

  await recipientRef.update({
    fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    fcmToken: admin.firestore.FieldValue.delete(),
  });
};

const sendToTokens = async ({ recipientRef, tokens, title, body, data }) => {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };

  const message = {
    notification: {
      title: title || "Notification",
      body: body || "",
    },
    data: toFcmData(data),
  };

  if (tokens.length === 1) {
    try {
      await admin.messaging().send({ ...message, token: tokens[0] });
      return { successCount: 1, failureCount: 0 };
    } catch (error) {
      if (recipientRef && invalidTokenCodes.has(error.code)) {
        await removeInvalidTokens(recipientRef, tokens, [{ error }]);
      }
      throw error;
    }
  }

  const response = await admin.messaging().sendEachForMulticast({
    ...message,
    tokens,
  });

  if (recipientRef) {
    await removeInvalidTokens(recipientRef, tokens, response.responses);
  }

  return response;
};

const setCorsHeaders = (req, res) => {
  res.set("Access-Control-Allow-Origin", req.get("origin") || "*");
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const updateSourceMailStatus = async (data, status, extra = {}) => {
  if (!data.sourceCollection || !data.sourceDocId) return;

  const prefix = data.mailKind === "delivery_proof" ? "deliveryMail" : "receipt";
  const update = {
    [`${prefix}Status`]: status,
  };

  if (status === "sent") {
    update[`${prefix}SentAt`] = admin.firestore.FieldValue.serverTimestamp();
    update[`${prefix}ErrorMessage`] = admin.firestore.FieldValue.delete();
  }

  if (status === "failed") {
    update[`${prefix}FailedAt`] = admin.firestore.FieldValue.serverTimestamp();
    update[`${prefix}ErrorMessage`] = extra.errorMessage || "Mail failed";
  }

  await db.collection(data.sourceCollection).doc(data.sourceDocId).update(update);
};

// ─── SMTP CONFIG ─────────────────────────────────────────────────────────────
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass) return null;
  return { host, port, secure, auth: { user, pass }, from };
};

// ─── EMAIL HTML BUILDER ───────────────────────────────────────────────────────
const buildEmailHtml = (data) => {
  const donorName = data.donorName || "Valued Donor";
  const mailKind =
    data.mailKind || (data.deliveryProofImageUrl ? "delivery_proof" : "receipt");

  if (mailKind === "delivery_proof") {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #1f2937;">Donation Delivery Update</h2>
      <p>Dear ${donorName},</p>
      <p>Your donated items have reached Hope Home Foundation. Thank you for helping us support the children in our care.</p>
      ${data.deliveryNotes ? `<p><strong>Delivery notes:</strong> ${data.deliveryNotes}</p>` : ""}
      ${data.deliveryProofImageUrl ? `<p><a href="${data.deliveryProofImageUrl}">View delivery proof</a></p>` : ""}
      <br />
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0; font-weight: 700;">Hop Home Foundation</p>
    </div>
  `;
  }

  const heading =
    data.type === "money"
      ? "Official Donation Receipt"
      : "Material Donation Acknowledgement";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #1f2937;">${heading}</h2>
      <p>Dear ${donorName},</p>
      <p>Thank you for your generous support to Hope Home Foundation.</p>
      <p>Please find your ${data.type === "money" ? "receipt" : "acknowledgement"} attached to this email.</p>
      <p>If you have any questions, please reply to this email and we will be happy to assist.</p>
      <br />
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0; font-weight: 700;">Hope Home Foundation</p>
    </div>
  `;
};

// ─── 1. SEND DONATION RECEIPT EMAIL (v2, asia-south1) ────────────────────────
exports.sendDonationMail = onDocumentCreated(
  {
    document: "mail_requests/{requestId}",
    region: "asia-south1",
    secrets: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
  },
  async (event) => {
    const snapshot = event.data;
    const requestId = event.params.requestId;
    const data = snapshot.data() || {};

    const processableStatuses = new Set([
      undefined,
      null,
      "pending",
      "queued",
      "delivery_proof_uploaded",
    ]);
    if (!processableStatuses.has(data.status)) return null;

    const donorEmail = data.donorEmail;
    if (!donorEmail) {
      await snapshot.ref.update({
        status: "failed",
        errorMessage: "Missing donor email",
      });
      await updateSourceMailStatus(data, "failed", {
        errorMessage: "Missing donor email",
      });
      return null;
    }

    try {
      const smtpConfig = getSmtpConfig();
      if (!smtpConfig) throw new Error("SMTP config missing.");

      const transporter = nodemailer.createTransport(smtpConfig);
      const attachments = [];

      if (data.pdfUrl) {
        const response = await axios.get(data.pdfUrl, {
          responseType: "arraybuffer",
          timeout: 20000,
        });
        attachments.push({
          filename: "donation-document.pdf",
          content: Buffer.from(response.data),
          contentType: "application/pdf",
        });
      }

      const subject =
        data.mailKind === "delivery_proof" || data.deliveryProofImageUrl
          ? "Donation Delivery Update"
          : data.type === "money"
            ? "Official Donation Receipt"
            : "Material Donation Acknowledgement";

      await transporter.sendMail({
        from: smtpConfig.from,
        to: donorEmail,
        subject,
        html: buildEmailHtml(data),
        attachments,
      });

      await snapshot.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        errorMessage: admin.firestore.FieldValue.delete(),
      });
      await updateSourceMailStatus(data, "sent");

      console.log(
        `Receipt email sent to ${donorEmail} for request ${requestId}`,
      );
    } catch (error) {
      console.error(`Failed to send mail for request ${requestId}:`, error);
      await snapshot.ref.update({
        status: "failed",
        errorMessage: error.message || "Unknown mail error",
      });
      await updateSourceMailStatus(data, "failed", {
        errorMessage: error.message || "Unknown mail error",
      });
    }
    return null;
  },
);

// ─── 2. ON DONATION ASSIGNMENT UPDATED (v1, working) ─────────────────────────
exports.onDonationAssignmentUpdated = functions
  .region("asia-south1")
  .firestore.document("donations/{donationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return null;
    if (after.status !== "assigned") return null;

    const volunteerId = after.assignedVolunteerId;
    if (!volunteerId) return null;

    try {
      const recipient = await findRecipientDoc(volunteerId);
      if (!recipient) return null;

      const tokens = getTokens(recipient.snapshot.data());
      if (!tokens.length) {
        console.log(`Volunteer ${volunteerId} has no FCM token`);
        return null;
      }

      await sendToTokens({
        recipientRef: recipient.ref,
        tokens,
        title: "New Pickup Task Assigned",
        body: "You have been assigned a new donation pickup task.",
        data: { donationId: context.params.donationId, type: "assignment" },
      });

      await recipient.ref.collection("notifications").add({
        title: "New Pickup Task Assigned",
        body: "You have been assigned a new donation pickup task.",
        donationId: context.params.donationId,
        type: "assignment",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Assignment notification sent to volunteer ${volunteerId}`);
    } catch (error) {
      console.error("Error sending assignment notification:", error);
    }
    return null;
  });

// ─── 3. SEND EVENT DECISION NOTIFICATION (v2, asia-south1) ───────────────────
exports.sendEventDecisionNotification = onDocumentCreated(
  {
    document: "event_decisions/{decisionId}",
    region: "asia-south1",
  },
  async (event) => {
    const data = event.data.data();
    if (!data) return null;

    const { userId, decision, eventName = "the event" } = data;
    if (!userId || !decision) return null;

    try {
      const recipient = await findRecipientDoc(userId);
      if (!recipient) return null;

      const tokens = getTokens(recipient.snapshot.data());
      if (!tokens.length) {
        console.log(`User ${userId} has no FCM token`);
        return null;
      }

      const title =
        decision === "approved"
          ? "Event Registration Approved!"
          : "Event Registration Update";
      const body =
        decision === "approved"
          ? `Your registration for ${eventName} has been approved.`
          : `Your registration for ${eventName} was not approved this time.`;

      await sendToTokens({
        recipientRef: recipient.ref,
        tokens,
        title,
        body,
        data: {
          decisionId: event.params.decisionId,
          decision,
          type: "event_decision",
        },
      });

      console.log(`Event decision notification sent to user ${userId}`);
    } catch (error) {
      console.error("Error sending event decision notification:", error);
    }
    return null;
  },
);

// ─── 4. MANUAL NOTIFY DONOR — also handles delivered + announcement (HTTP) ───
// Since onDonationDelivered and sendAnnouncementNotification can't deploy
// in asia-south1 due to a GCP Eventarc bug, this HTTP endpoint covers them.
// Call it from your React app after marking a donation delivered or
// publishing an announcement.
// exports.sendTargetedNotification = onDocumentCreated(
//   {
//     document: "targeted_notifications/{notificationId}",
//     region: "asia-south1",
//     database: "(default)",
//   },
//   async (event) => {
//     const snapshot = event.data;
//     const data = snapshot.data() || {};
//     const { userId, title, body } = data;

//     if (!userId) {
//       await snapshot.ref.update({
//         status: "failed",
//         errorMessage: "Missing userId",
//       });
//       return null;
//     }

//     try {
//       const recipient = await findRecipientDoc(userId);
//       if (!recipient) throw new Error(`No user or volunteer found for ${userId}`);

//       const tokens = getTokens(recipient.snapshot.data());
//       if (!tokens.length) throw new Error(`No FCM token found for ${userId}`);

//       const response = await sendToTokens({
//         recipientRef: recipient.ref,
//         tokens,
//         title,
//         body,
//         data: {
//           type: data.decision ? "event_decision" : data.type || "notification",
//           notificationId: event.params.notificationId,
//           eventId: data.eventId || "",
//           decision: data.decision || "",
//         },
//       });

//       await recipient.ref.collection("notifications").add({
//         title: title || "Notification",
//         body: body || "",
//         eventId: data.eventId || "",
//         decision: data.decision || "",
//         isRead: false,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });

//       await snapshot.ref.update({
//         status: "sent",
//         successCount: response.successCount,
//         failureCount: response.failureCount,
//         sentAt: admin.firestore.FieldValue.serverTimestamp(),
//         errorMessage: admin.firestore.FieldValue.delete(),
//       });
//     } catch (error) {
//       console.error("Error sending targeted notification:", error);
//       await snapshot.ref.update({
//         status: "failed",
//         errorMessage: error.message || "Unknown notification error",
//       });
//     }

//     return null;
//   },
// );

exports.sendTargetedNotification = functions
  .region("asia-south1")
  .firestore.document("targeted_notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};
    const { userId, title, body, eventId, decision } = data;

    if (!userId) {
      await snap.ref.update({ status: "failed", errorMessage: "Missing userId" });
      return null;
    }

    try {
      const recipient = await findRecipientDoc(userId);
      if (!recipient) throw new Error(`No user found for ${userId}`);

      const tokens = getTokens(recipient.snapshot.data());
      if (!tokens.length) throw new Error(`No FCM token found for ${userId}`);

      const response = await sendToTokens({
        recipientRef: recipient.ref,
        tokens,
        title: title || "Notification",
        body:  body  || "",
        data: {
          type:           decision ? "event_decision" : "notification",
          eventId:        eventId  || "",
          decision:       decision || "",
          notificationId: context.params.notificationId,
        },
      });

      await recipient.ref.collection("notifications").add({
        title:    title    || "Notification",
        body:     body     || "",
        eventId:  eventId  || "",
        decision: decision || "",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await snap.ref.update({
        status: "sent",
        successCount: response.successCount,
        failureCount: response.failureCount,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        errorMessage: admin.firestore.FieldValue.delete(),
      });

      console.log(`Targeted notification sent to ${userId}`);
    } catch (error) {
      console.error("Targeted notification error:", error);
      await snap.ref.update({ status: "failed", errorMessage: error.message || "Unknown error" });
    }
    return null;
  });
exports.onDonationDelivered = functions
  .region("asia-south1")
  .runWith({ failurePolicy: false })   // ← add this
  .firestore.document("donations/{donationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const becameDelivered =
      before.status !== "delivered" && after.status === "delivered";
    const shouldNotify = after.notifyDonor === true;

    if (!becameDelivered && !shouldNotify) return null;

    const donorId = after.donorId || after.userId;
    if (!donorId) {
      await change.after.ref.update({ notifyDonor: false });
      console.warn("Delivered donation has no donorId/userId.");
      return null;
    }

    try {
      const recipient = await findRecipientDoc(donorId);
      if (!recipient) throw new Error(`No user found for donor ${donorId}`);

      const tokens = getTokens(recipient.snapshot.data());
      if (!tokens.length) throw new Error(`No FCM token found for donor ${donorId}`);

      await sendToTokens({
        recipientRef: recipient.ref,
        tokens,
        title: "Donation Delivered Successfully",
        body: "Your donation has reached the orphanage.",
        data: {
          type: "donation_delivered",
          donationId: context.params.donationId,
          pickupImageUrl: after.proofImageUrl || "",
          deliveryProofImageUrl: after.deliveryProofImageUrl || "",
        },
      });
      await recipient.ref.collection("notifications").add({
  title: "Donation Delivered Successfully",
  body: "Your donation has reached the orphanage.",
  donationId: context.params.donationId,
  type: "donation_delivered",
  isRead: false,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

      console.log(`Delivered notification sent to donor ${donorId}`);
    } catch (error) {
      console.error("Error sending delivered notification:", error);
    } finally {
      await change.after.ref.update({ notifyDonor: false });
    }

    return null;
  });

exports.manualNotifyDonor = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // ✅ Destructure FIRST before any type checks
    const {
      type,
      userId,
      donorId,
      volunteerId,
      title,
      body,
      topic,
      eventId,
      decision,
      data: extraData,
    } = req.body;

    try {
      // ─── Targeted notification to a specific user ──────────────────────────
      if (type === "targeted") {
        if (!userId) {
          res.status(400).json({ error: "userId is required" });
          return;
        }

        const recipient = await findRecipientDoc(userId);
        if (!recipient) {
          res.status(404).json({ error: `No user found for ${userId}` });
          return;
        }

        const tokens = getTokens(recipient.snapshot.data());
        if (!tokens.length) {
          res.status(400).json({ error: "No FCM token found" });
          return;
        }

        const response = await sendToTokens({
          recipientRef: recipient.ref,
          tokens,
          title: title || "Notification",
          body: body || "",
          data: {
            type: decision ? "event_decision" : type || "notification",
            eventId: eventId || "",
            decision: decision || "",
          },
        });

        await recipient.ref.collection("notifications").add({
          title: title || "Notification",
          body: body || "",
          eventId: eventId || "",
          decision: decision || "",
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, ...response });
        return;
      }

      // ─── Topic broadcast (announcements) ──────────────────────────────────
      if (type === "topic" && topic) {
        await admin.messaging().send({
          topic,
          notification: { title: title || "Announcement", body: body || "" },
          data: toFcmData(extraData),
        });
        res.status(200).json({ success: true, sent: "topic", topic });
        return;
      }

      // ─── Notify a specific donor/volunteer by ID ───────────────────────────
      const targetId = donorId || volunteerId;
      if (!targetId) {
        res.status(400).json({ error: "donorId, volunteerId, or topic is required" });
        return;
      }

      const recipient = await findRecipientDoc(targetId);
      const tokens = recipient ? getTokens(recipient.snapshot.data()) : [];

      if (!tokens.length) {
        res.status(400).json({ error: "No FCM token found for this user" });
        return;
      }

      const response = await sendToTokens({
        recipientRef: recipient.ref,
        tokens,
        title: title || "Notification",
        body: body || "",
        data: extraData,
      });

      console.log(`Notification sent to ${targetId}`);
      res.status(200).json({
        success: true,
        sent: "token",
        targetId,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: error.message });
    }
  },
);
