import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

// POST /api/users/follow-requests/[id]/accept
// POST /api/users/follow-requests/[id]/reject
// The [id] here is the ID of the user who SENT the request
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: requesterId } = await params;
  const receiverId = session.user.id;
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop(); // "accept" or "reject"

  await connectToDatabase();

  const [receiver, requester] = await Promise.all([
    User.findById(receiverId),
    User.findById(requesterId),
  ]);

  if (!receiver || !requester) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hasRequest = receiver.followRequestsReceived.some(
    (id: any) => id.toString() === requesterId
  );
  if (!hasRequest) {
    return NextResponse.json({ error: "No pending request found" }, { status: 400 });
  }

  // Remove from request arrays for both
  receiver.followRequestsReceived = receiver.followRequestsReceived.filter(
    (id: any) => id.toString() !== requesterId
  );
  requester.followRequestsSent = requester.followRequestsSent.filter(
    (id: any) => id.toString() !== receiverId
  );

  if (action === "accept") {
    receiver.followers.push(requester._id);
    requester.following.push(receiver._id);
  }

  await Promise.all([receiver.save(), requester.save()]);

  return NextResponse.json({
    success: true,
    action,
    followerCount: receiver.followers.length,
  });
}
