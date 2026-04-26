import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { success } = rateLimit(`profile-update-${userId}`, 10, 60 * 60 * 1000); // 10 updates/hour
    if (!success) return rateLimitResponse();

    const body = await req.json();
    const { name, image, bio, website, twitter, github } = body;

    await connectToDatabase();

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (image) updates.image = image;
    
    // Profile sub-document
    updates.profile = {};
    if (bio !== undefined) updates.profile.bio = sanitizeHtml(bio.trim());
    
    updates.profile.socialLinks = {};
    if (website !== undefined) updates.profile.socialLinks.website = website.trim();
    if (twitter !== undefined) updates.profile.socialLinks.twitter = twitter.trim();
    if (github !== undefined) updates.profile.socialLinks.github = github.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
