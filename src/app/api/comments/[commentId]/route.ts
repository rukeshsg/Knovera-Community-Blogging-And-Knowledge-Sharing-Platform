import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Comment from "@/models/Comment";

// DELETE /api/comments/[commentId] — soft delete own comment
export async function DELETE(
  _req: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;
    await connectToDatabase();

    const comment = await Comment.findById(commentId);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.author.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    comment.isDeleted = true;
    comment.content = "[deleted]";
    await comment.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE comment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/comments/[commentId]/like — toggle like on a comment
export async function POST(
  _req: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;
    await connectToDatabase();

    const comment = await Comment.findById(commentId);
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = session.user.id;
    const alreadyLiked = comment.likes.some((id: any) => id.toString() === userId);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id: any) => id.toString() !== userId);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();
    return NextResponse.json({ liked: !alreadyLiked, count: comment.likes.length });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
