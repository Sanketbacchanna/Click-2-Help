const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const twilio = require("twilio");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, ".")));



// Socket.io logic
io.on("connection", (socket) => {


    socket.on("disconnect", () => {
        // Optional: Clean up session after some time if sender disconnects
    });
});

// Add a GET route for /send-sos to handle browser visits
app.get("/send-sos", (req, res) => {
    res.send("This endpoint only accepts POST requests for SOS alerts. Please use the app interface.");
});

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const twilioNumber = process.env.TWILIO_NUMBER || "+18398677377";

// Validate Credentials
if (!accountSid || !authToken) {
    console.warn("⚠️  WARNING: Twilio credentials (TWILIO_SID, TWILIO_AUTH) are missing in .env");
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

    if (!client) {
        console.error("❌ SOS Failed: Twilio client not initialized");
        return res.status(500).send({
            success: false,
            error: "SMS service not configured on server."
        });
    }

    try {
        const results = await Promise.allSettled(
            contacts.map(number => {
                // 1. Clean the number: remove all non-digits (except +)
                let cleaned = number.replace(/[^\d+]/g, "").trim();

                // 2. Handle leading 0s (common mistake)
                if (cleaned.startsWith("0")) {
                    cleaned = cleaned.substring(1);
                }

                // 3. Ensure international format (+91 for India by default)
                let formattedNumber = cleaned;
                if (!formattedNumber.startsWith("+")) {
                    formattedNumber = "+91" + formattedNumber;
                }

                // 4. Simplified body for better delivery
                const body = `SafeGuard SOS Alert: I need help. \nLocation: ${location}`;

                return client.messages.create({
                    body: body,
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
server.listen(PORT, () => {
    console.log("========================================");
    console.log(`🚀 SafeGuard Server running on port ${PORT}`);

    console.log("========================================");
});

