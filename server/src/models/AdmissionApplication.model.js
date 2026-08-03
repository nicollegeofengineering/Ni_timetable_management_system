import mongoose from 'mongoose';

const admissionApplicationSchema = new mongoose.Schema({
  academicYear: { type: String, required: true },
  name: { type: String, required: true },
  fatherName: { type: String, required: true },
  hallTicketNo: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
  religion: { type: String, required: true },
  community: { type: String, required: true },
  residenceAddress: { type: String, required: true },
  permanentAddress: { type: String, required: true },
  sameAsResidence: { type: Boolean, default: false },
  district: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  mobile: { type: String, required: true },
  parentMobile: { type: String, required: true },
  email: { type: String, required: true },
  admissionFor: { type: String, required: true },
  department: { type: String, required: true },
  branchPreferred: { type: String, required: true },
  cutoffMark: { type: Number, required: false },            // NEW
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  adminComment: { type: String, default: '' },
  ip: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Unique constraint: one hall ticket per academic year
admissionApplicationSchema.index({ hallTicketNo: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('AdmissionApplication', admissionApplicationSchema);