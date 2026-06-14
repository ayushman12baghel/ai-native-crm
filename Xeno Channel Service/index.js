require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Environment ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;

if (!WEBHOOK_URL || !CHANNEL_SECRET) {
  console.error(
    "❌  Missing required env vars: WEBHOOK_URL and CHANNEL_SECRET must be set in .env"
  );
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a random integer between min and max (inclusive), in milliseconds.
 */
function randomDelay(minSec, maxSec) {
  return (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;
}

/**
 * Non-blocking sleep utility.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [1000, 2000]; // delays after attempt 1 and 2

/**
 * Dispatches a webhook POST to the configured WEBHOOK_URL with retry logic.
 *
 * - Up to 3 attempts with exponential backoff (1s, 2s).
 * - Network errors and non-2xx responses both trigger a retry.
 * - After 3 failures, logs a permanent failure warning and gives up.
 *
 * Payload:  { communication_id, status, timestamp }
 * Header:   X-Hub-Signature-256: sha256=<HMAC-SHA256 hex digest of payload body>
 */
async function dispatchWebhook(communicationId, status) {
  const payload = {
    communication_id: communicationId,
    status,
    timestamp: new Date().toISOString(),
  };

  // Stringify once — used for both the request body and the HMAC signature
  const body = JSON.stringify(payload);
  const signature =
    "sha256=" +
    crypto.createHmac("sha256", CHANNEL_SECRET).update(body).digest("hex");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(
      `📤  Webhook attempt ${attempt}/${MAX_RETRIES} | id=${communicationId}  status=${status}  → ${WEBHOOK_URL}`
    );

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": signature,
        },
        body,
      });

      if (response.ok) {
        console.log(
          `✅  Webhook succeeded (${response.status}) | id=${communicationId}  status=${status}`
        );
        return; // success — exit the retry loop
      }

      // Non-2xx — treat as retryable
      console.error(
        `⚠️  Webhook returned ${response.status} for id=${communicationId} (attempt ${attempt}/${MAX_RETRIES})`
      );
    } catch (err) {
      // Network error — treat as retryable
      console.error(
        `❌  Webhook dispatch failed for id=${communicationId} (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`
      );
    }

    // Wait before next attempt (no delay after the final failed attempt)
    if (attempt < MAX_RETRIES) {
      const delay = BACKOFF_DELAYS[attempt - 1];
      console.log(`⏳  Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  // All attempts exhausted
  console.error(
    `🚨  PERMANENT FAILURE: Webhook for id=${communicationId} status=${status} failed after ${MAX_RETRIES} attempts. Delivery receipt dropped.`
  );
}

// ── Channel Simulators ──────────────────────────────────────────────────────

/**
 * WHATSAPP: DELIVERED (2-5s) → READ (2-5s after DELIVERED)
 */
function simulateWhatsApp(communicationId) {
  const deliverDelay = randomDelay(2, 5);

  setTimeout(() => {
    dispatchWebhook(communicationId, "DELIVERED");

    const readDelay = randomDelay(2, 5);
    setTimeout(() => {
      dispatchWebhook(communicationId, "READ");
    }, readDelay);
  }, deliverDelay);
}

/**
 * EMAIL: DELIVERED (10-30s) → 40% OPENED → 10% CLICKED
 */
function simulateEmail(communicationId) {
  const deliverDelay = randomDelay(10, 30);

  setTimeout(() => {
    dispatchWebhook(communicationId, "DELIVERED");

    // 40% chance the email is opened
    if (Math.random() < 0.4) {
      const openDelay = randomDelay(5, 15);
      setTimeout(() => {
        dispatchWebhook(communicationId, "OPENED");

        // 10% chance the email link is clicked (conditional on OPENED)
        if (Math.random() < 0.1) {
          const clickDelay = randomDelay(3, 10);
          setTimeout(() => {
            dispatchWebhook(communicationId, "CLICKED");
          }, clickDelay);
        }
      }, openDelay);
    }
  }, deliverDelay);
}

/**
 * SMS: 90% DELIVERED / 10% FAILED (5-10s)
 */
function simulateSms(communicationId) {
  const deliverDelay = randomDelay(5, 10);

  setTimeout(() => {
    const status = Math.random() < 0.9 ? "DELIVERED" : "FAILED";
    dispatchWebhook(communicationId, status);
  }, deliverDelay);
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /send
 *
 * Accepts a communication request and immediately returns 202 Accepted.
 * After responding, an async simulation fires channel-appropriate webhooks
 * back to the CRM via dispatchWebhook().
 *
 * Request body:
 *   { communication_id: string, channel_type: string, recipient: string }
 *
 * Response (202):
 *   { status: "queued", communication_id: <id> }
 */
app.post("/send", (req, res) => {
  const { communication_id, channel_type, recipient } = req.body;

  // Basic validation
  if (!communication_id || !channel_type || !recipient) {
    return res.status(400).json({
      error: "Missing required fields: communication_id, channel_type, recipient",
    });
  }

  console.log(
    `📨  Queued | id=${communication_id}  channel=${channel_type}  to=${recipient}`
  );

  // Fire-and-forget: kick off channel-specific simulation after responding
  switch (channel_type.toUpperCase()) {
    case "WHATSAPP":
      simulateWhatsApp(communication_id);
      break;
    case "EMAIL":
      simulateEmail(communication_id);
      break;
    case "SMS":
      simulateSms(communication_id);
      break;
    default:
      console.warn(`⚠️  Unknown channel_type: ${channel_type} — no simulation will run`);
  }

  return res.status(202).json({
    status: "queued",
    communication_id,
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "channel-service" });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Channel Service listening on http://localhost:${PORT}`);
  console.log(`🔗  Webhook target: ${WEBHOOK_URL}`);
});
