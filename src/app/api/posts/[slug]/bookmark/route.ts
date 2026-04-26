import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Post from "@/models/Post";
import Notification from "@/models/Notification";

// POST /api/posts/[postId]/bookmark — toggle bookmark
export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug: postId } = await params;
    const userId = session.user.id;

    await connectToDatabase();

    const [user, post] = await Promise.all([
      User.findById(userId).select("bookmarks").lean() as any,
      Post.findById(postId).select("author title").lean() as any,
    ]);

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const isBookmarked = user.bookmarks?.some((id: any) => id.toString() === postId);

    if (isBookmarked) {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $pull: { bookmarks: postId } }),
        Post.findByIdAndUpdate(postId, { $pull: { bookmarks: userId } }),
      ]);
    } else {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $addToSet: { bookmarks: postId } }),
        Post.findByIdAndUpdate(postId, { $addToSet: { bookmarks: userId } }),
      ]);

      // Notify post author (not if bookmarking own post)
      if (post.author.toString() !== userId) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: "BOOKMARK_POST",
          post: postId,
        });
      }
    }

    const updated = await User.findById(userId).select("bookmarks").lean() as any;

    return NextResponse.json({
      bookmarked: !isBookmarked,
      count: updated.bookmarks.length,
    });
  } catch (error) {
    console.error("Bookmark error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
