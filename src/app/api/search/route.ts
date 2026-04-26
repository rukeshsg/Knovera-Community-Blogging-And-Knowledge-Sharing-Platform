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
    
    // Explicitly import User model so Mongoose can resolve the 'author' ref
    User.findOne({});

    const regex = new RegExp(query, "i");

    // We fetch up to 15 recent matches, then sort them in JS for title prioritization
    // as MongoDB regex doesn't natively produce a text-score without a text index.
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
      .limit(15)
      .lean() as any[];

    // Scoring: 
    // Title match: +10 points
    // Exact word boundary title match: +20 points
    // Fallback: mostly relies on recent creation date from initial sort
    const scoredPosts = posts.map(post => {
      let score = 0;
      if (post.title) {
        if (post.title.toLowerCase().includes(query.toLowerCase())) {
          score += 10;
        }
        if (new RegExp(`\\b${query}\\b`, 'i').test(post.title)) {
          score += 20;
        }
      }
      return { ...post, _score: score };
    });

    // Sort by score descending, then fallback to original order
    scoredPosts.sort((a, b) => b._score - a._score);

    // Take top 5
    const topResults = scoredPosts.slice(0, 5).map(post => {
      // Remove score before sending
      const { _score, ...cleanPost } = post;
      return cleanPost;
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
