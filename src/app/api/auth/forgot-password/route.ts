import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

function generateOtp(): string {
  // Cryptographically random 6-digit OTP
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: Request) {
  const ip = getIP(req);
  const { success } = rateLimit(`forgot-pass-${ip}`, 5, 10 * 60 * 1000);
  if (!success) return rateLimitResponse();

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    if (user.authProvider === "GOOGLE") {
      return NextResponse.json({ error: "Please sign in with Google." }, { status: 400 });
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    user.resetOtp = hashedOtp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetOtpAttempts = 0; // reset attempt counter on new OTP generation
    await user.save();

    // ─── Developer fallback: print OTP to terminal if SMTP not configured ───
    console.log("\n=========================================");
    console.log(`🔐 PASSWORD RESET OTP for ${email}: ${otp}`);
    console.log("=========================================\n");
    // ────────────────────────────────────────────────────────────────────────

    const emailHtml = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#fff;border:1px solid #E5E7EB;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#92400E;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Knovera</h2>
        </div>
        <h3 style="color:#111827;font-size:20px;font-weight:700;margin-bottom:12px;text-align:center;">Your Password Reset Code</h3>
        <p style="color:#4B5563;font-size:15px;line-height:1.6;margin-bottom:28px;text-align:center;">
          Use the 6-digit code below to reset your password. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#FEF3C7;border:2px dashed #92400E;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#92400E;">${otp}</span>
        </div>
        <p style="color:#6B7280;font-size:13px;text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #E5E7EB;">
          If you didn't request this, you can safely ignore this email. Never share this code with anyone.
        </p>
      </div>
    `;

    await sendEmail({ to: user.email, subject: "Your Knovera password reset code", html: emailHtml });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
