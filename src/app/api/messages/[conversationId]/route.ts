import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";

// GET /api/messages/[conversationId] — get messages in a conversation
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId } = await params;
    await connectToDatabase();

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: session.user.id,
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name image")
      .sort({ createdAt: 1 })
      .lean();

    // Mark unread messages as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: session.user.id }, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
