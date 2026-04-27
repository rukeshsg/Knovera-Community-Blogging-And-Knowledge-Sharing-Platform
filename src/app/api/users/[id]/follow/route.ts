import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/users/[id]/follow
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetId } = await params;
    const currentUserId = session.user.id;

    const { success } = rateLimit(`follow-${currentUserId}`, 50, 60 * 60 * 1000); // 50 follows/hour
    if (!success) return rateLimitResponse();

    if (currentUserId === targetId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    await connectToDatabase();

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetId),
    ]);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Defensive: ensure array fields exist (in case of legacy/seeded users)
    currentUser.following = currentUser.following ?? [];
    currentUser.followers = currentUser.followers ?? [];
    currentUser.followRequestsSent = currentUser.followRequestsSent ?? [];
    currentUser.followRequestsReceived = currentUser.followRequestsReceived ?? [];
    targetUser.following = targetUser.following ?? [];
    targetUser.followers = targetUser.followers ?? [];
    targetUser.followRequestsSent = targetUser.followRequestsSent ?? [];
    targetUser.followRequestsReceived = targetUser.followRequestsReceived ?? [];

    const isFollowing = currentUser.following.some((id: any) => id.toString() === targetId);
    const hasRequested = currentUser.followRequestsSent.some((id: any) => id.toString() === targetId);

    // --- UNFOLLOW ---
    if (isFollowing) {
      currentUser.following = currentUser.following.filter((id: any) => id.toString() !== targetId);
      targetUser.followers = targetUser.followers.filter((id: any) => id.toString() !== currentUserId);
      await Promise.all([currentUser.save(), targetUser.save()]);
      return NextResponse.json({ state: "none", followerCount: targetUser.followers.length });
    }

    // --- CANCEL REQUEST ---
    if (hasRequested) {
      currentUser.followRequestsSent = currentUser.followRequestsSent.filter(
        (id: any) => id.toString() !== targetId
      );
      targetUser.followRequestsReceived = targetUser.followRequestsReceived.filter(
        (id: any) => id.toString() !== currentUserId
      );
      await Promise.all([currentUser.save(), targetUser.save()]);
      return NextResponse.json({ state: "none", followerCount: targetUser.followers.length });
    }

    // --- FOLLOW (public) or REQUEST (private) ---
    if (targetUser.isPrivate) {
      currentUser.followRequestsSent.push(targetUser._id);
      targetUser.followRequestsReceived.push(currentUser._id);
      await Promise.all([currentUser.save(), targetUser.save()]);
      // Optional: create a "FOLLOW_REQUEST" notification type in the future. 
      // For now, only notify on direct follow or we can notify on request too.
      return NextResponse.json({ state: "requested", followerCount: targetUser.followers.length });
    } else {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      await Promise.all([
        currentUser.save(), 
        targetUser.save(),
        Notification.create({
          recipient: targetId,
          sender: currentUserId,
          type: "FOLLOW",
        })
      ]);
      return NextResponse.json({ state: "following", followerCount: targetUser.followers.length });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/users/[id]/follow — check follow status
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ state: "none", followerCount: 0 });

    const { id: targetId } = await params;
    await connectToDatabase();

    const [currentUser, targetUser] = await Promise.all([
      User.findById(session.user.id).select("following followRequestsSent").lean() as any,
      User.findById(targetId).select("followers").lean() as any,
    ]);

    const isFollowing = currentUser?.following?.some((i: any) => i.toString() === targetId) ?? false;
    const hasRequested = currentUser?.followRequestsSent?.some((i: any) => i.toString() === targetId) ?? false;
    
    let state = "none";
    if (isFollowing) state = "following";
    else if (hasRequested) state = "requested";

    return NextResponse.json({
      state,
      followerCount: targetUser?.followers?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
