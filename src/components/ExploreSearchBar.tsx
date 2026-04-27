"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Calendar, MessageSquare } from "lucide-react";
import { safeJson } from "@/lib/api-utils";

export default function ExploreSearchBar({ initialQuery, initialTag }: { initialQuery: string; initialTag: string }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const searchAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError("");
      setSelectedIndex(-1);
      if (searchAbortController.current) searchAbortController.current.abort();
      return;
    }

    setIsSearching(true);
    setSearchError("");

    if (searchAbortController.current) searchAbortController.current.abort();
    const abortController = new AbortController();
    searchAbortController.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: abortController.signal
        });
        const data = await safeJson(res);
        if (data) {
          // Show both users and posts in the dropdown
          setSearchResults(data.results || []);
          setSelectedIndex(-1);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSearchError("Failed to fetch results.");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, initialQuery]);

  const highlightMatch = (text: string, query: string) => {
    if (!text) return text;
    if (!query) return text;
    // Escape regex special characters
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold px-0.5 rounded">{part}</span>
        : part
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        e.preventDefault();
        const item = searchResults[selectedIndex];
        window.location.href = item.type === "user" ? `/profile/${item._id}` : `/post/${item.slug}`;
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  return (
    <form method="GET" action="/explore" className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
      <input
        type="text"
        name="q"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 200);
        }}
        autoComplete="off"
        placeholder="Search stories, people, or keywords..."
        className="w-full pl-12 pr-4 py-4 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-2xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all shadow-sm text-lg"
      />
      {initialTag && <input type="hidden" name="tag" value={initialTag} />}

      {isFocused && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-2xl z-[100] max-h-[60vh] overflow-y-auto">
          <div className="py-2 px-2">
            {isSearching ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 items-start animate-pulse">
                    <div className="w-16 h-12 bg-[var(--color-bg-secondary)] rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--color-bg-secondary)] rounded w-3/4"></div>
                      <div className="h-3 bg-[var(--color-bg-secondary)] rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="p-4 text-center text-[var(--color-primary)] font-medium">{searchError}</div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col">
                <div className="space-y-1" role="listbox">
                  {searchResults.map((item, idx) => {
                    const isUser = item.type === "user";
                    return (
                      <Link
                        key={item._id}
                        href={isUser ? `/profile/${item._id}` : `/post/${item.slug}`}
                        className={`flex gap-3 items-center p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors ${selectedIndex === idx ? "bg-[var(--color-bg-soft)] ring-2 ring-[var(--color-primary)]/20" : ""}`}
                        role="option"
                        aria-selected={selectedIndex === idx}
                      >
                        {isUser ? (
                          <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden bg-[var(--color-bg-secondary)] ring-2 ring-[var(--color-bg-secondary)]">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)] font-bold text-base">
                                {item.name?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                        ) : (
                          item.coverImage ? (
                            <div className="relative w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                              <Image src={item.coverImage} alt={item.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-12 shrink-0 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                          )
                        )}

                        <div className="flex-1 min-w-0">
                          {isUser ? (
                            <>
                              <h4 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                                {highlightMatch(item.name, searchQuery)}
                              </h4>
                              <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                                {item.profile?.bio || item.email || "Knovera Member"}
                              </p>
                            </>
                          ) : (
                            <>
                              <h4 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                                {highlightMatch(item.title, searchQuery)}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                                <span className="font-medium truncate">{item.author?.name}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  className="mt-2 mx-2 p-2 text-center text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors border border-[var(--color-primary)]/20"
                >
                  See all stories for &quot;{searchQuery}&quot;
                </button>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <Search className="w-8 h-8 text-[var(--color-text-secondary)] mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No results found</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
