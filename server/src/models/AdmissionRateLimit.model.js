import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  action: { type: String, enum: ['send-otp', 'submit'], default: 'send-otp' },
  count: { type: Number, default: 1 },
  resetAt: { type: Date, required: true },
});

rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AdmissionRateLimit', rateLimitSchema);