import { Router } from "express";
import { sendOtp, verifyOtp} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { otpRequestLimiter, otpVerifyLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/send-otp", otpRequestLimiter, sendOtp);
router.post("/verify-otp", otpVerifyLimiter, verifyOtp);


export default router;
