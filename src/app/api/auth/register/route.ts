import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getIP(req);
  const { success } = rateLimit(`register-${ip}`, 10, 15 * 60 * 1000); // 10 registrations per 15 mins
  if (!success) return rateLimitResponse();

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "CREDENTIALS",
      verificationToken: crypto.createHash("sha256").update(verificationToken).digest("hex"),
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${verificationToken}`;
    
    // IMPORTANT: Log the URL to the terminal so developers can test without SMTP configured
    console.log("\n=========================================");
    console.log("✉️ EMAIL VERIFICATION URL (Click to test locally):");
    console.log(verifyUrl);
    console.log("=========================================\n");

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w-lg mx-auto p-8 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
        <div style="text-align: center; margin-bottom: 32px;">
          <h2 style="color: #92400E; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Knovera</h2>
        </div>
        <h3 style="color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px; text-align: center;">Welcome to the Community!</h3>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center;">
          Hi ${name}, we're thrilled to have you here. Please verify your email address to unlock full access to sharing stories and connecting with others.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}" style="display: inline-block; background-color: #92400E; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(146, 64, 14, 0.2);">Verify Email Address</a>
        </div>
        <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `;

    await sendEmail({ to: user.email, subject: "Verify your Knovera account", html: emailHtml });

    return NextResponse.json({ success: true, message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
