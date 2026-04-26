import { NextResponse } from "next/server";

// Simple memory-based rate limiter
// Key: identifier (e.g. IP or userId)
// Value: { count, resetTime }
const cache = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = cache.get(identifier);

  if (!entry || entry.resetTime < now) {
    cache.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}

// Helper to get client IP
export function getIP(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0] : "127.0.0.1";
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}
