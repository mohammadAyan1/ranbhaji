import express from "express";
import { 
    register, login, getMe, logout, 
    verifyRegistrationOTP, resendOTP, 
    forgotPassword, verifyForgotPasswordOTP, resetPassword 
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);

router.post("/verify-registration-otp", verifyRegistrationOTP);
router.post("/resend-otp", resendOTP);

router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPassword);

export default router;