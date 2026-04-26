import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import User from "@/models/User";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

import Notification from "@/models/Notification";

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

    const result = conversations.map((c: any) => ({
      ...c,
      _id: c._id.toString(),
      other: c.participants.find((p: any) => p._id.toString() !== session.user.id),
      requestedBy: c.requestedBy?.toString(),
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
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { success } = rateLimit(`msg-send-${userId}`, 100, 60 * 60 * 1000);
    if (!success) return rateLimitResponse();

    const { recipientId, content } = await req.json();
    if (!recipientId) {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }

    if (userId === recipientId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    await connectToDatabase();

    const recipient = await User.findById(recipientId).select("followers");
    if (!recipient) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sender = await User.findById(userId).select("followers");

    const senderFollowsRecipient = recipient.followers?.some((id: any) => id.toString() === userId);
    const recipientFollowsSender = sender?.followers?.some((id: any) => id.toString() === recipientId);
    const isConnected = senderFollowsRecipient && recipientFollowsSender;

    // Use findOneAndUpdate with upsert to completely eliminate race conditions
    let conversation = await Conversation.findOneAndUpdate(
      { participants: { $all: [userId, recipientId], $size: 2 } },
      {
        $setOnInsert: {
          participants: [userId, recipientId],
          requestedBy: userId,
          status: isConnected ? "ACCEPTED" : "PENDING",
          lastMessageAt: new Date(),
        }
      },
      { new: true, upsert: true }
    );

    if (conversation.status === "PENDING" && conversation.lastMessage) {
      if (conversation.requestedBy.toString() !== userId) {
        return NextResponse.json({ error: "You must accept the request first." }, { status: 403 });
      }
      return NextResponse.json({ error: "Wait for the user to accept your request." }, { status: 403 });
    }

    if (conversation.status === "REJECTED") {
      return NextResponse.json({ error: "Cannot send message." }, { status: 403 });
    }

    // If no content is provided, we just want to initialize the conversation
    if (!content?.trim()) {
      return NextResponse.json({
        conversationId: conversation._id.toString(),
      }, { status: 200 });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      content: content.trim(),
    });

    await Promise.all([
      Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
      }),
      Notification.create({
        recipient: recipientId,
        sender: userId,
        type: "MESSAGE",
      })
    ]);

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
