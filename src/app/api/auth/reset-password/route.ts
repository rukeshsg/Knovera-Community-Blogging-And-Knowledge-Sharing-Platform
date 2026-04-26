import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const ip = getIP(req);
  const { success } = rateLimit(`reset-pass-${ip}`, 5, 10 * 60 * 1000);
  if (!success) return rateLimitResponse();

  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return NextResponse.json({ error: "Invalid or expired OTP. Please request a new one." }, { status: 400 });
    }

    // Check expiry
    if (new Date() > user.resetOtpExpiry) {
      user.resetOtp = undefined;
      user.resetOtpExpiry = undefined;
      user.resetOtpAttempts = 0;
      await user.save();
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // Brute-force protection
    if ((user.resetOtpAttempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Please request a new OTP." }, { status: 429 });
    }

    const hashedInput = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedInput !== user.resetOtp) {
      user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
      await user.save();
      const remaining = MAX_ATTEMPTS - user.resetOtpAttempts;
      return NextResponse.json(
        { error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
        { status: 400 }
      );
    }

    // OTP is valid — update password and clear OTP fields
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    return NextResponse.json({ success: true, message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
