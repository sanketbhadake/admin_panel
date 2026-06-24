// functions/index.js
// Firebase Cloud Function — watches donations/{id} for status="delivered"
// and sends a push notification + in-app notification to the donor.
//
// Deploy:  firebase deploy --only functions
// Requires: firebase-admin, firebase-functions (v4+)

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging }      = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();

// ── Main Trigger ──────────────────────────────────────────────────────────────
//
// Fires whenever any donation document is updated.
// Proceeds only when:
//   1. New status is "delivered"  (previously was not)
//   2. notifyDonor flag is true   (set by admin in donars.jsx)

exports.onDonationDelivered = onDocumentUpdated(
  "donations/{donationId}",
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    const donationId = event.params.donationId;

    // Guard: only act on the delivered transition + notifyDonor flag
    const justDelivered =
      after.status === "delivered" && before.status !== "delivered";
    const shouldNotify = after.notifyDonor === true;

    if (!justDelivered || !shouldNotify) return null;

    console.log(`[onDonationDelivered] Processing donation ${donationId}`);

    const { donorId, donorName, itemDescription, assignedVolunteerName } = after;

    if (!donorId) {
      console.warn("No donorId on donation — cannot notify.");
      return null;
    }

    // ── 1. In-app notification (Firestore sub-collection) ─────────────────
    const notifRef = db
      .collection("users")
      .doc(donorId)
      .collection("notifications")
      .doc();

    await notifRef.set({
      type: "donation_delivered",
      title: "Your donation was delivered! 🎉",
      body: `"${itemDescription}" has been successfully delivered by ${
        assignedVolunteerName || "a volunteer"
      }. Thank you for your generosity!`,
      donationId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`[onDonationDelivered] In-app notification written for user ${donorId}`);

    // ── 2. Push notification via FCM ──────────────────────────────────────
    // Fetch donor's FCM token(s) from their user document
    const userSnap = await db.collection("users").doc(donorId).get();

    if (!userSnap.exists) {
      console.warn(`User document not found for donorId=${donorId}`);
    } else {
      const userData = userSnap.data();
      const fcmTokens = userData.fcmTokens || (userData.fcmToken ? [userData.fcmToken] : []);

      if (fcmTokens.length === 0) {
        console.warn(`No FCM tokens for user ${donorId}`);
      } else {
        // Send to all registered devices (multicast)
        const message = {
          notification: {
            title: "Your donation was delivered! 🎉",
            body: `"${itemDescription}" reached its destination safely. Thank you, ${donorName}!`,
          },
          data: {
            type: "donation_delivered",
            donationId,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          android: {
            notification: {
              channelId: "donation_updates",
              priority: "high",
              color: "#059669",
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: "default",
              },
            },
          },
          tokens: fcmTokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);

        console.log(
          `[onDonationDelivered] FCM sent: ${response.successCount} success, ${response.failureCount} failed`
        );

        // Clean up invalid/expired tokens
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            (resp.error?.code === "messaging/registration-token-not-registered" ||
              resp.error?.code === "messaging/invalid-registration-token")
          ) {
            invalidTokens.push(fcmTokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          const cleanTokens = fcmTokens.filter((t) => !invalidTokens.includes(t));
          await db.collection("users").doc(donorId).update({
            fcmTokens: cleanTokens,
          });
          console.log(`[onDonationDelivered] Cleaned ${invalidTokens.length} invalid token(s)`);
        }
      }
    }

    // ── 3. Clear the notifyDonor flag to prevent re-triggering ────────────
    await event.data.after.ref.update({ notifyDonor: false });

    console.log(`[onDonationDelivered] Done for donation ${donationId}`);
    return null;
  }
);


// ── (Optional) HTTP endpoint — manual re-notify ───────────────────────────────
// POST https://<region>-<project>.cloudfunctions.net/manualNotifyDonor
// Body: { "donationId": "abc123" }
//
// Useful for retrying a failed notification from the admin panel.

const { onRequest } = require("firebase-functions/v2/https");

exports.manualNotifyDonor = onRequest(async (req, res) => {
  // Simple auth check — replace with proper Firebase Auth verification
  const adminToken = req.headers["x-admin-token"];
  if (adminToken !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { donationId } = req.body;
  if (!donationId) return res.status(400).json({ error: "donationId required" });

  const snap = await db.collection("donations").doc(donationId).get();
  if (!snap.exists) return res.status(404).json({ error: "Donation not found" });

  await snap.ref.update({ notifyDonor: true });

  return res.json({ success: true, message: "notifyDonor flag set; trigger will fire shortly." });
});

exports.sendEventDecisionNotification = onDocumentCreated(
  "targeted_notifications/{notificationId}",
  async (event) => {
    try {
      const data = event.data.data();
      console.log("🎯 Targeted notification request:", data);

      const { userId, title, body, eventId, decision } = data;

      if (!userId) {
        console.log("❌ No userId provided — cannot target notification");
        return null;
      }

      // Look up just this one donor's token
      const donorDoc = await admin.firestore().collection("donors").doc(userId).get();

      if (!donorDoc.exists) {
        console.log(`❌ No donor doc found for userId: ${userId}`);
        return null;
      }

      const donor = donorDoc.data();
      const token = donor.fcmToken;

      if (!token) {
        console.log(`❌ Donor ${userId} has no fcmToken saved`);
        return null;
      }

      const response = await admin.messaging().send({
        token,
        notification: {
          title: title || "Event Request Update",
          body: body || "Your event request status has changed.",
        },
        data: {
          eventId: eventId || "",
          decision: decision || "",
          type: "event_decision",
        },
      });

      console.log("✅ Targeted notification sent:", response);
      return response;
    } catch (error) {
      console.error("🔥 Error sending targeted notification:", error);
      return null;
    }
  }
);
exports.sendEventDecisionNotification = onDocumentCreated(
  "targeted_notifications/{notificationId}",
  async (event) => {
    try {
      const data = event.data.data();
      const { userId, title, body, eventId, decision } = data;

      if (!userId) return null;

      const donorDoc = await admin.firestore().collection("donors").doc(userId).get();
      if (!donorDoc.exists) return null;

      const token = donorDoc.data().fcmToken;
      if (!token) return null;

      const response = await admin.messaging().send({
        token,
        notification: { title: title || "Event Request Update", body: body || "" },
        data: { eventId: eventId || "", decision: decision || "", type: "event_decision" },
      });

      console.log("✅ Targeted notification sent:", response);
      return response;
    } catch (error) {
      console.error("🔥 Error sending targeted notification:", error);
      return null;
    }
  }
);