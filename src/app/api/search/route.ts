import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

// Force dynamic since search params change constantly
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getIP(req);
  // Allow 30 searches per minute per IP for live typing
  const { success } = rateLimit(`live-search-${ip}`, 30, 60 * 1000);
  if (!success) return rateLimitResponse();

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }

    await connectToDatabase();
    
    // Escape special characters to prevent regex crashes
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    // Search for Users
    const users = await User.find({
      $or: [
        { name: regex },
        { email: regex }
      ]
    })
      .select("_id name email image profile")
      .limit(5)
      .lean() as any[];

    // We fetch up to 15 recent matches, then sort them in JS for title prioritization
    const posts = await Post.find({
      isPublished: true,
      $or: [
        { title: regex },
        { content: regex },
      ]
    })
      .select("_id title coverImage slug createdAt author views")
      .populate("author", "name image")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean() as any[];

    // Normalize Users
    const scoredUsers = users.map(u => {
      let score = 5; // Base score for users
      if (u.name && u.name.toLowerCase().includes(query.toLowerCase())) score += 15;
      if (u.name && new RegExp(`\\b${escapedQuery}\\b`, 'i').test(u.name)) score += 25;
      return { ...u, type: 'user', _score: score };
    });

    // Normalize Posts
    const scoredPosts = posts.map(post => {
      let score = 0;
      if (post.title) {
        if (post.title.toLowerCase().includes(query.toLowerCase())) {
          score += 10;
        }
        if (new RegExp(`\\b${escapedQuery}\\b`, 'i').test(post.title)) {
          score += 20;
        }
      }
      return { ...post, type: 'post', _score: score };
    });

    // Combine and Sort by score descending, then fallback to original order
    const combined = [...scoredUsers, ...scoredPosts];
    combined.sort((a, b) => b._score - a._score);

    // Take top 6 total
    const topResults = combined.slice(0, 6).map(item => {
      // Remove score before sending
      const { _score, ...cleanItem } = item;
      return cleanItem;
    });

    // We can run a quick count query if we want to show "See all X results"
    // However, countDocuments with regex can be slow. 
    // To keep it blazing fast for live search, we can just say "See all results" without the count,
    // or just return the count of our fetched limited array.
    const totalCount = await Post.countDocuments({
      isPublished: true,
      $or: [
        { title: regex },
        { content: regex },
      ]
    });

    return NextResponse.json({ results: topResults, total: totalCount });

  } catch (error) {
    console.error("Live Search API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
