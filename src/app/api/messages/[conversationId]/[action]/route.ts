import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string; action: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, action } = await params;

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify the user is a participant and the conversation is pending
    // Usually the model is named Conversation but the file might be Message.ts.
    // In previous steps I modified it. Let's make sure I use the right model.
    // Wait, let's use standard Mongoose logic. I can just require the model from mongoose if I have to,
    // but I'll assume Conversation is default export from models/Message or models/Conversation.
    // In my previous edit I updated 'Conversation' model. Let's look up how it was exported in the previous file.
    
    // Actually, I can just write the logic assuming standard import.
    // Let me check what the model file is named. In earlier context:
    // <target_file>r:/project/Knovera-Community-Platform/src/models/Message.ts</target_file>
    // Updated Conversation model...
    
    // I will use mongoose.models.Conversation to be perfectly safe.
    const mongoose = require("mongoose");
    const Conversation = mongoose.models.Conversation;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status !== "PENDING") {
      return NextResponse.json({ error: "Conversation is not pending" }, { status: 400 });
    }

    // Only the person who received the request can accept or reject it
    if (conversation.requestedBy.toString() === session.user.id) {
      return NextResponse.json({ error: "You cannot accept your own request" }, { status: 403 });
    }

    // Verify user is in the conversation
    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "accept") {
      conversation.status = "ACCEPTED";
      await conversation.save();
      return NextResponse.json({ success: true, status: "ACCEPTED" });
    } else {
      conversation.status = "REJECTED";
      // We can also just delete it:
      // await Conversation.findByIdAndDelete(conversationId);
      await conversation.save();
      return NextResponse.json({ success: true, status: "REJECTED" });
    }
  } catch (error) {
    console.error("Message action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
