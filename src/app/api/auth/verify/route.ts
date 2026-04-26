import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));

    await connectToDatabase();
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({ verificationToken: hashedToken });
    if (!user) return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return NextResponse.redirect(new URL("/login?verified=true", req.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", req.url));
  }
}
