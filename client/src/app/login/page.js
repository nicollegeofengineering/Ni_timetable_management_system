"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  useEffect(()=>{
    sessionStorage.removeItem("token");
  },[])

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { email });
      setStep("otp");
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "failed to send otp");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response=await api.post("/auth/verify-otp", { email, otp });
     
      if (response.data.token) {
         sessionStorage.setItem("token",response.data.token);
         router.push("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "invalid otp");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Login</h1>
        <p className={styles.subtitle}>Noorul Islam College Timetable System</p>

        {step === "email" && (
          <form onSubmit={handleSendOtp}>
            <label className={styles.label}>Admin Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nice.ac.in"
              required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp}>
            <label className={styles.label}>Enter OTP sent to {email}</label>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <p
              className={styles.resend}
              data-disabled={cooldown > 0}
              onClick={cooldown > 0 ? undefined : handleSendOtp}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
