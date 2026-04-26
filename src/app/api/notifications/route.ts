import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Notification from "@/models/Notification";

// GET /api/notifications — fetch paginated notifications for the current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    await connectToDatabase();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: session.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "name image")
        .populate("post", "title slug")
        .lean(),
      Notification.countDocuments({ recipient: session.user.id, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { ids } = body; // optional: specific IDs; if omitted, mark all

    await connectToDatabase();

    const filter: any = { recipient: session.user.id, isRead: false };
    if (ids?.length) filter._id = { $in: ids };

    await Notification.updateMany(filter, { $set: { isRead: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
