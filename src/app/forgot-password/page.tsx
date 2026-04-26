"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, MailOpen, KeyRound, RefreshCw, Eye, EyeOff } from "lucide-react";

type Step = "email" | "otp" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
      setResendCooldown(60);
      inputRefs.current[0]?.focus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const updated = [...otp];
    pasted.split("").forEach((char, i) => { updated[i] = char; });
    setOtp(updated);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setStep("success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md bg-[var(--color-bg-soft)] p-8 rounded-2xl border border-[var(--color-bg-secondary)] shadow-xl">
        
        {/* Back link */}
        {step !== "success" && (
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
          </Link>
        )}

        {/* Step: Email */}
        {step === "email" && (
          <>
            <div className="mb-8">
              <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center mb-4">
                <MailOpen className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] mb-2">Forgot your password?</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">No worries! Enter your email and we'll send you a 6-digit verification code.</p>
            </div>
            {error && <p className="text-red-500 text-sm mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">{error}</p>}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full p-3.5 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[var(--color-primary)] text-white p-3.5 rounded-xl font-bold hover:bg-[#7a350b] transition-colors flex justify-center items-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : "Send Verification Code"}
              </button>
            </form>
          </>
        )}

        {/* Step: OTP + New Password */}
        {step === "otp" && (
          <>
            <div className="mb-8">
              <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] mb-2">Enter verification code</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">We sent a 6-digit code to <span className="font-semibold text-[var(--color-text-primary)]">{email}</span>. Check your terminal if SMTP isn't configured.</p>
            </div>
            {error && <p className="text-red-500 text-sm mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">{error}</p>}
            <form onSubmit={handleVerifyAndReset} className="space-y-6">
              {/* OTP Input Boxes */}
              <div>
                <label className="block text-sm font-medium mb-3 text-[var(--color-text-secondary)]">6-Digit Code</label>
                <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full p-3.5 pr-12 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[var(--color-primary)] text-white p-3.5 rounded-xl font-bold hover:bg-[#7a350b] transition-colors flex justify-center items-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Resetting...</> : "Reset Password"}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Resend code in <span className="font-bold text-[var(--color-primary)]">{resendCooldown}s</span></p>
                ) : (
                  <button type="button" onClick={sendOtp} disabled={loading} className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline font-medium disabled:opacity-50">
                    <RefreshCw className="w-4 h-4" /> Resend Code
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] mb-3">Password Reset!</h2>
            <p className="text-[var(--color-text-secondary)] mb-8">Your password has been updated successfully.</p>
            <Link href="/login" className="inline-block w-full bg-[var(--color-primary)] text-white p-3.5 rounded-xl font-bold hover:bg-[#7a350b] transition-colors text-center">
              Sign In Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
