const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, ".")));

// Add a GET route for /send-sos to handle browser visits
app.get("/send-sos", (req, res) => {
    res.send("This endpoint only accepts POST requests for SOS alerts. Please use the app interface.");
});

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const twilioNumber = process.env.TWILIO_NUMBER || "+18398677377"; // Fallback to provided number if not in env

// Validate Credentials
if (!accountSid || !authToken) {
    console.warn("⚠️  WARNING: Twilio credentials (TWILIO_SID, TWILIO_AUTH) are missing in .env");
    console.warn("Backend will run, but SOS messages will fail to send.");
}

let client;
try {
    if (accountSid && authToken) {
        client = twilio(accountSid, authToken);
    }
} catch (e) {
    console.error("❌ Failed to initialize Twilio client:", e.message);
}

app.post("/send-sos", async (req, res) => {
    const { contacts, location } = req.body;

    if (!contacts || contacts.length === 0) {
        return res.status(400).send({ success: false, error: "No contacts provided" });
    }

    console.log(`[${new Date().toISOString()}] 📨 SOS Triggered!`);
    console.log("📍 Location:", location);
    console.log("👥 Contacts:", contacts);

    if (!client) {
        console.error("❌ SOS Failed: Twilio client not initialized (check .env)");
        return res.status(500).send({
            success: false,
            error: "SMS service not configured on server. Please check environment variables."
        });
    }

    try {
        const results = await Promise.allSettled(
            contacts.map(number => {
                let formattedNumber = number.trim();
                // Basic normalization for India numbers if country code missing
                if (!formattedNumber.startsWith("+")) {
                    formattedNumber = "+91" + formattedNumber;
                }

                return client.messages.create({
                    body: `🚨 EMERGENCY! I need help.\n\nMy real-time location:\n${location}`,
                    from: twilioNumber,
                    to: formattedNumber
                });
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`);

        if (successful > 0) {
            res.send({ success: true, sent: successful, failed: failed });
        } else {
            const firstError = results.find(r => r.status === 'rejected')?.reason?.message;
            throw new Error(firstError || "Failed to send any messages");
        }

    } catch (err) {
        console.error("❌ SOS Error:", err.message);
        res.status(500).send({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("========================================");
    console.log(`🚀 SafeGuard Server running on port ${PORT}`);
    console.log(`🔗 SOS Endpoint: http://localhost:${PORT}/send-sos`);
    console.log("========================================");
});
