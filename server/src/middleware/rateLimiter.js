import rateLimit from "express-rate-limit";

export const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "too many otp requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
