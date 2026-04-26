import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import User from "@/models/User";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// GET /api/messages — list all conversations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const conversations = await Conversation.find({ participants: session.user.id })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "name image")
      .populate("lastMessage", "content createdAt sender")
      .lean();

    // Serialize and filter out current user from participants list
    const result = conversations.map((c: any) => ({
      ...c,
      _id: c._id.toString(),
      other: c.participants.find((p: any) => p._id.toString() !== session.user.id),
    }));

    return NextResponse.json({ conversations: result });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages — start a conversation or send a message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { success } = rateLimit(`msg-send-${userId}`, 100, 60 * 60 * 1000);
    if (!success) return rateLimitResponse();

    const { recipientId, content } = await req.json();
    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ error: "recipientId and content are required" }, { status: 400 });
    }

    const senderId = session.user.id;
    if (senderId === recipientId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    await connectToDatabase();

    const recipient = await User.findById(recipientId);
    if (!recipient) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Find existing conversation or create new one
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        lastMessageAt: new Date(),
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content: content.trim(),
    });

    // Update conversation's lastMessage pointer
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    const populated = await message.populate("sender", "name image");

    return NextResponse.json({
      conversationId: conversation._id.toString(),
      message: populated,
    }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
