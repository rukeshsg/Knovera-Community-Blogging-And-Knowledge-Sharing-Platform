/**
 * Safely parses a fetch response as JSON.
 * Verifies res.ok and content-type before parsing.
 * Returns null if parsing fails or status is not ok.
 */
export async function safeJson<T = any>(res: Response): Promise<T | null> {
  if (!res.ok) {
    try {
      const text = await res.text();
      console.error(`Fetch failed (${res.status}):`, text);
    } catch {
      console.error(`Fetch failed (${res.status})`);
    }
    return null;
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    console.error("Fetch returned non-JSON response:", contentType);
    return null;
  }

  try {
    return await res.json();
  } catch (err) {
    console.error("Failed to parse JSON response:", err);
    return null;
  }
}
