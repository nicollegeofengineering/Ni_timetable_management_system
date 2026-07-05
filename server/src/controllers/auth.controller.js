import crypto from "crypto";
import dotenv from "dotenv";
import Admin from "../models/admin.model.js";
import Otp from "../models/otp.model.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { signToken } from "../utils/token.js";

dotenv.config();

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Get admin emails from environment variable
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

console.log(adminEmails)
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendOtp(req, res) {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "email is required" });

    // Check if email is an admin email
    if (!adminEmails.includes(email)) {
      return res.status(401).json({ message: "email not recognized" });
    }


    const recent = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "please wait before requesting another otp" });
    }

    const otp = generateOtp();
    await Otp.deleteMany({ email });
    await Otp.create({
      email,
      otpHash: hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await sendOtpEmail(email, otp);
    res.json({ message: "otp sent" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: error.message});
  }
}

export async function verifyOtp(req, res) {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const otp = String(req.body.otp || "").trim();
    if (!email || !otp) return res.status(400).json({ message: "email and otp are required" });

    // Check if email is an admin email
    if (!adminEmails.includes(email)) {
      return res.status(401).json({ message: "email not recognized" });
    }


    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!record) return res.status(404).json({ message: "otp not found, request a new one" });

    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(429).json({ message: "too many failed attempts, request a new otp" });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await record.deleteOne();
      return res.status(410).json({ message: "otp expired, request a new one" });
    }

    if (record.otpHash !== hashOtp(otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(401).json({ message: "incorrect otp" });
    }

    await record.deleteOne();

    // Generate token with admin details
    const token = signToken({ 
      email: email, 
      role: 'admin' 
    });

    res.json({ 
      message: "logged in", 
      token,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: error});
  }
}