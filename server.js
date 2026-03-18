const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_AUTH;
// console.log(process.env.TWILIO_SID);
// console.log(process.env.TWILIO_AUTH);
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;

console.log("SID:", accountSid);
console.log("TOKEN:", authToken);

// if (!accountSid || !authToken) {
//     console.error("❌ Twilio credentials missing in .env");
//     process.exit(1);
// }

const client = twilio(accountSid, authToken);
const twilioNumber = "+18398677377";

app.post("/send-sos", async (req, res) => {

    const { contacts, location } = req.body;

    if (!contacts || contacts.length === 0) {
        return res.status(400).send({ error: "No contacts provided" });
    }

    console.log("📨 Sending SOS to:", contacts);
    console.log("📍 Location:", location);

    try {

        await Promise.all(
            contacts.map(number => {
                if (!number.startsWith("+")){
                    number = "+91" + number;
                }

                return client.messages.create({
                    body: `🚨 EMERGENCY! I need help.\nLocation: ${location}`,
                    from: twilioNumber,
                    to: number
                });
            })
        );

        res.send({ success: true });

    } catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).send({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));