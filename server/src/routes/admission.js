import express from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import AdmissionApplication from '../models/AdmissionApplication.model.js';
import AdmissionOtp from '../models/AdmissionOtp.model.js';
import AdmissionRateLimit from '../models/AdmissionRateLimit.model.js';
import { sendAdmissionOtp, sendApplicationReceived, sendApplicationStatusUpdate, notifyAdminNewApplication } from '../utils/email.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper to generate OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Helper to check rate limit
const checkRateLimit = async (ip, action, limit, windowMinutes) => {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMinutes * 60000);
  let record = await AdmissionRateLimit.findOne({ ip, action });
  if (!record) {
    record = new AdmissionRateLimit({ ip, action, count: 1, resetAt });
    await record.save();
    return true;
  }
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = resetAt;
    await record.save();
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  await record.save();
  return true;
};

// ---------- PUBLIC ROUTES ----------

// 1. Send OTP – 15 per hour
router.post('/send-otp', async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const ip = req.ip || req.connection.remoteAddress;

    const existing=await admissionApplication.findOne({ email: email.trim() });
    if(existing){
      return res.status(409).json({ success: false, message: 'This email has already been used for an application.' });
    }

    const allowed = await checkRateLimit(ip, 'send-otp', 15, 60);
    if (!allowed) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Please try after an hour.' });
    }
    

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60000);
    await AdmissionOtp.create({ email: email.trim(), otp, expiresAt });
    await sendAdmissionOtp(email, otp);

    res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    await connectDB();
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const record = await AdmissionOtp.findOne({ email: email.trim(), otp });
    if (!record) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (record.used) return res.status(400).json({ success: false, message: 'OTP already used' });
    if (new Date() > record.expiresAt) return res.status(400).json({ success: false, message: 'OTP expired' });

    record.used = true;
    await record.save();
    const token = jwt.sign({ email: email.trim() }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.status(200).json({ success: true, token, message: 'OTP verified' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Check duplicate hall ticket
router.get('/check-hall-ticket', async (req, res) => {
  try {
    await connectDB();
    const { hallTicketNo, academicYear } = req.query;
    if (!hallTicketNo || !academicYear) {
      return res.status(400).json({ success: false, message: 'hallTicketNo and academicYear required' });
    }
    const existing = await AdmissionApplication.findOne({ hallTicketNo, academicYear });
    res.status(200).json({ exists: !!existing });
  } catch (err) {
    console.error('Error checking hall ticket:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Submit application – 1 per hour
router.post('/submit', async (req, res) => {
  try {
    await connectDB();
    const ip = req.ip || req.connection.remoteAddress;

    

    const {
      token,
      academicYear,
      name,
      fatherName,
      hallTicketNo,
      dob,
      gender,
      religion,
      community,
      residenceAddress,
      permanentAddress,
      sameAsResidence,
      district,
      state,
      pincode,
      mobile,
      parentMobile,
      email,
      admissionFor,
      branchPreferred,
      cutoffMark,
    } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    if (decoded.email !== email) {
      return res.status(400).json({ success: false, message: 'Email mismatch' });
    }

    // Duplicate checks
    const existingEmail = await AdmissionApplication.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'This email has already been used for an application.' });
    }
    const existingHall = await AdmissionApplication.findOne({ hallTicketNo, academicYear });
    if (existingHall) {
      return res.status(409).json({ success: false, message: 'This hall ticket number has already been used for this academic year.' });
    }

    // Validate required fields
    if (!name || !fatherName || !hallTicketNo || !dob || !gender || !religion || !community ||
        !residenceAddress || !permanentAddress || !district || !state || !pincode ||
        !mobile || !parentMobile || !email || !admissionFor || !branchPreferred) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate cutoffMark (optional)
    let cutoff = null;
    if (cutoffMark !== undefined && cutoffMark !== null && cutoffMark !== '') {
      const parsed = parseFloat(cutoffMark);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ success: false, message: 'Cutoff mark must be a positive number.' });
      }
      cutoff = parsed;
    }

    // Create application
    const application = new AdmissionApplication({
      academicYear,
      name: name.trim(),
      fatherName: fatherName.trim(),
      hallTicketNo: hallTicketNo.trim(),
      dob: new Date(dob),
      gender,
      religion,
      community,
      residenceAddress: residenceAddress.trim(),
      permanentAddress: sameAsResidence ? residenceAddress.trim() : permanentAddress.trim(),
      sameAsResidence: !!sameAsResidence,
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      mobile: mobile.trim(),
      parentMobile: parentMobile.trim(),
      email: email.trim(),
      admissionFor: admissionFor.trim(),
      branchPreferred: branchPreferred.trim(),
      cutoffMark: cutoff,
      ip,
      emailVerified: true,
    });

    await application.save();

    // Send emails
    await sendApplicationReceived(email, name, application._id);
    await notifyAdminNewApplication(application);

    res.status(201).json({ success: true, message: 'Application submitted successfully!', applicationId: application._id });
  } catch (err) {
    console.error('Error submitting application:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- ADMIN ROUTES (unchanged) ----------
const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

router.get('/admin/applications', adminAuth, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { hallTicketNo: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const [applications, total] = await Promise.all([
      AdmissionApplication.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      AdmissionApplication.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      data: applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
    });
  } catch (err) {
    console.error('Error fetching admin applications:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/:id', async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const application = await AdmissionApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.status(200).json({ success: true, data: application });
  } catch (err) {
    console.error('Error fetching application:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { status, adminComment } = req.body;
    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const application = await AdmissionApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    application.status = status;
    if (adminComment !== undefined) application.adminComment = adminComment;
    await application.save();

    await sendApplicationStatusUpdate(application.email, application.name, status, adminComment);

    res.status(200).json({ success: true, message: 'Application updated', data: application });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;