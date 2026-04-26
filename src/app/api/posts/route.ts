import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import slugify from "slugify";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { success } = rateLimit(`post-create-${userId}`, 10, 60 * 60 * 1000);
    if (!success) return rateLimitResponse();

    const { title, content, coverImage, tags, isPublished } = await req.json();
    const cleanContent = sanitizeHtml(content);

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    await connectToDatabase();

    // Generate unique slug
    // Generate unique slug
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    
    const existingSlugs = await Post.find({ slug: new RegExp(`^${baseSlug}`) }).select("slug").lean();
    if (existingSlugs.length > 0) {
      const slugSet = new Set(existingSlugs.map((p: any) => p.slug));
      let counter = 1;
      while (slugSet.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const post = await Post.create({
      title,
      slug,
      content: cleanContent,
      coverImage,
      tags: tags || [],
      isPublished: isPublished !== undefined ? isPublished : false,
      author: (session.user as any).id,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const posts = await Post.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name image")
      .lean();

    const total = await Post.countDocuments({ isPublished: true });

    return NextResponse.json({ posts: JSON.parse(JSON.stringify(posts)), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
