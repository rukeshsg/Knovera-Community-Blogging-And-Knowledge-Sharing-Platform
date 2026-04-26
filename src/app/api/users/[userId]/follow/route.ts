import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/users/[userId]/follow — toggle follow/unfollow
export async function POST(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUserId = session.user.id;
    const { success } = rateLimit(`follow-${currentUserId}`, 50, 60 * 60 * 1000); // 50 follows/hour
    if (!success) return rateLimitResponse();

    const { userId } = await params;

    if (currentUserId === userId) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    await connectToDatabase();

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isFollowing = currentUser.following.some((id: any) => id.toString() === userId);

    if (isFollowing) {
      // Unfollow
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
        User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } }),
      ]);
    } else {
      // Follow + create notification
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } }),
        User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } }),
        Notification.create({
          recipient: userId,
          sender: currentUserId,
          type: "FOLLOW",
        }),
      ]);
    }

    const updatedTarget = await User.findById(userId).select("followers").lean() as any;

    return NextResponse.json({
      following: !isFollowing,
      followerCount: updatedTarget.followers.length,
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/users/[userId]/follow — check follow status
export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ following: false, followerCount: 0 });

    const { userId } = await params;
    await connectToDatabase();

    const [currentUser, targetUser] = await Promise.all([
      User.findById(session.user.id).select("following").lean() as any,
      User.findById(userId).select("followers").lean() as any,
    ]);

    const following = currentUser?.following?.some((id: any) => id.toString() === userId) ?? false;

    return NextResponse.json({
      following,
      followerCount: targetUser?.followers?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
