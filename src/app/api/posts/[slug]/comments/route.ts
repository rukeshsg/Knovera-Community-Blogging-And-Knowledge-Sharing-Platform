import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

// GET /api/posts/[postId]/comments — fetch paginated comments for a post
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug: postId } = await params;
    const { searchParams } = new URL(_req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const topLevelComments = await Comment.find({ post: postId, parentComment: null, isDeleted: false })
      .populate("author", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch replies for these comments
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (c: any) => {
        const replies = await Comment.find({ parentComment: c._id, isDeleted: false })
          .populate("author", "name image")
          .sort({ createdAt: 1 })
          .lean();
        return {
          ...c,
          _id: c._id.toString(),
          author: { ...c.author, _id: c.author._id.toString() },
          likes: c.likes.map((id: any) => id.toString()),
          replies: replies.map((r: any) => ({
            ...r,
            _id: r._id.toString(),
            author: { ...r.author, _id: r.author._id.toString() },
            likes: r.likes.map((id: any) => id.toString()),
          })),
        };
      })
    );

    const total = await Comment.countDocuments({ post: postId, parentComment: null, isDeleted: false });

    return NextResponse.json({
      comments: commentsWithReplies,
      total,
      hasMore: total > skip + limit,
    });
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/posts/[postId]/comments — create a new comment or reply
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { success } = rateLimit(`comment-${userId}`, 30, 60 * 60 * 1000); // 30 comments/hour
    if (!success) return rateLimitResponse();

    const { slug: postId } = await params;
    const { content, parentCommentId } = await req.json();

    if (!content?.trim()) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    const cleanContent = sanitizeHtml(content.trim());
    if (cleanContent.length > 2000) return NextResponse.json({ error: "Comment is too long" }, { status: 400 });

    await connectToDatabase();

    const post = await Post.findById(postId);
    if (!post || !post.isPublished) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content: cleanContent,
      parentComment: parentCommentId || null,
    });

    const populated = await comment.populate("author", "name image");

    return NextResponse.json({ 
      comment: {
        ...populated.toObject(),
        _id: populated._id.toString(),
        author: { ...populated.author, _id: (populated.author as any)._id.toString() },
        likes: populated.likes.map((id: any) => id.toString()),
        replies: []
      }
    }, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
