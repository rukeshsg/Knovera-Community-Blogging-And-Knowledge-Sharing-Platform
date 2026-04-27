"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import { Search, Moon, Sun, LogOut, User, MessageSquare, Bookmark, ChevronDown, Settings, X, Loader2, Calendar } from 'lucide-react';

function SignOutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="signout-title">
      <div
        className="bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-2xl p-6 w-80 mx-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      >
        <div className="flex flex-col gap-1">
          <h3 id="signout-title" className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Sign out?</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">You&apos;ll need to sign in again to access your account.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchAbortController = useRef<AbortController | null>(null);

  // Live search debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError("");
      setSelectedIndex(-1);
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
      return;
    }

    setIsSearching(true);
    setSearchError("");

    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    const abortController = new AbortController();
    searchAbortController.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: abortController.signal
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.results || []);
        setSelectedIndex(-1);
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
  }, [searchQuery]);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold px-0.5 rounded">{part}</span> 
        : part
    );
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Close search on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {showSignOutModal && (
        <SignOutModal
          onConfirm={() => { setShowSignOutModal(false); signOut({ callbackUrl: "/" }); }}
          onCancel={() => setShowSignOutModal(false)}
        />
      )}

      <nav className="sticky top-0 z-50 w-full border-b border-[var(--color-bg-secondary)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <div className="relative h-12 w-48 flex items-center">
                <Image
                  src={isDarkMode ? "/assets/knovera-logo-for-dark-theme.png" : "/assets/knovera-logo-transparent.png"}
                  alt="Knovera Logo"
                  fill
                  priority
                  sizes="192px"
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-text-secondary)]">
              <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
              <Link href="/explore" className="hover:text-[var(--color-primary)] transition-colors">Explore</Link>
              <Link href="/write" className="hover:text-[var(--color-primary)] transition-colors">Write</Link>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[var(--color-text-secondary)]">
            {showSearch ? (
              <div className="absolute inset-0 bg-[var(--background)] flex items-center px-4 sm:px-6 lg:px-8 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
                  <Search className="w-5 h-5 text-[var(--color-primary)]" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search Knovera..."
                    className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-primary)] font-medium text-xl placeholder:text-[var(--color-text-secondary)]/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedIndex(prev => Math.max(prev - 1, -1));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                          window.location.href = `/post/${searchResults[selectedIndex].slug}`;
                        } else if (searchQuery.trim()) {
                          window.location.href = `/explore?q=${encodeURIComponent(searchQuery.trim())}`;
                        }
                      } else if (e.key === "Escape") {
                        setShowSearch(false);
                      }
                    }}
                  />
                  <button onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }} className="p-2 hover:bg-[var(--color-bg-soft)] rounded-full transition-colors text-[var(--color-text-secondary)]">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Live Search Dropdown */}
                {searchQuery.trim() && (
                  <div className="absolute top-16 left-0 right-0 bg-[var(--background)] border-b border-[var(--color-bg-secondary)] shadow-2xl z-40 max-h-[70vh] overflow-y-auto">
                    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                      {isSearching ? (
                        <div className="space-y-4">
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
                        <div className="py-8 text-center text-red-500">{searchError}</div>
                      ) : searchResults.length > 0 ? (
                        <div className="flex flex-col">
                          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
                            Top results for &quot;{searchQuery}&quot;
                          </h3>
                          <div className="space-y-1" role="listbox">
                            {searchResults.map((post, idx) => (
                              <Link 
                                key={post._id} 
                                href={`/post/${post.slug}`}
                                className={`flex gap-4 items-start p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors ${selectedIndex === idx ? 'bg-[var(--color-bg-soft)] ring-2 ring-[var(--color-primary)]/20' : ''}`}
                                role="option"
                                aria-selected={selectedIndex === idx}
                                onClick={() => setShowSearch(false)}
                              >
                                {post.coverImage ? (
                                  <div className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                                    <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-20 h-14 shrink-0 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-[var(--color-text-muted)]" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-bold text-[var(--color-text-primary)] truncate">
                                    {highlightMatch(post.title, searchQuery)}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                                    <span className="font-medium truncate">{post.author?.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <Link
                            href={`/explore?q=${encodeURIComponent(searchQuery.trim())}`}
                            onClick={() => setShowSearch(false)}
                            className="mt-4 p-3 text-center text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors border border-[var(--color-primary)]/20"
                          >
                            See all results
                          </Link>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <Search className="w-12 h-12 text-[var(--color-text-secondary)] mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">No results found</h3>
                          <p className="text-[var(--color-text-secondary)] mt-1">We couldn&apos;t find any stories matching &quot;{searchQuery}&quot;</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="group flex items-center w-10 h-10 hover:w-[100px] rounded-full hover:bg-[var(--color-bg-soft)] transition-all duration-300 ease-in-out overflow-hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" 
                aria-label="Search"
              >
                <div className="flex items-center justify-center w-10 h-10 shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm font-semibold transition-opacity duration-200 pr-4">
                  Search
                </span>
              </button>
            )}
            
            {session && (
              <>
                <Link href="/messages" className="group flex items-center w-10 h-10 hover:w-[115px] rounded-full hover:bg-[var(--color-bg-soft)] transition-all duration-300 ease-in-out overflow-hidden text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" aria-label="Messages">
                  <div className="flex items-center justify-center w-10 h-10 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm font-semibold transition-opacity duration-200 pr-4">
                    Messages
                  </span>
                </Link>
                <Link href="/profile" className="group hidden sm:flex items-center w-10 h-10 hover:w-[100px] rounded-full hover:bg-[var(--color-bg-soft)] transition-all duration-300 ease-in-out overflow-hidden text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" aria-label="Profile">
                  <div className="flex items-center justify-center w-10 h-10 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm font-semibold transition-opacity duration-200 pr-4">
                    Profile
                  </span>
                </Link>
              </>
            )}

            <NotificationBell />
            <button 
              onClick={toggleTheme}
              className="group flex items-center w-10 h-10 hover:w-[135px] rounded-full hover:bg-[var(--color-bg-soft)] transition-all duration-300 ease-in-out overflow-hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" 
              aria-label="Toggle Theme"
            >
              <div className="flex items-center justify-center w-10 h-10 shrink-0">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm font-semibold transition-opacity duration-200 pr-4">
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            {session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu((o) => !o)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowUserMenu(o => !o); } }}
                  className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  {session.user?.image ? (
                    <Image src={session.user.image} alt="Profile" width={28} height={28} className="w-7 h-7 rounded-full ring-2 ring-[var(--color-primary)]/30 object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                      {session.user?.name?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {showUserMenu && (
                  <div 
                    className="absolute right-0 top-11 z-50 w-52 bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-2xl py-2 overflow-hidden"
                    role="menu"
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowUserMenu(false); }}
                  >
                    <div className="px-4 py-2 border-b border-[var(--color-bg-secondary)] mb-1">
                      <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{session.user?.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{session.user?.email}</p>
                    </div>
                    {[
                      { href: "/profile", icon: <User className="w-4 h-4" />, label: "My Profile" },
                      { href: "/settings", icon: <Settings className="w-4 h-4" />, label: "Settings" },
                      { href: "/bookmarks", icon: <Bookmark className="w-4 h-4" />, label: "Bookmarks" },
                      { href: "/messages", icon: <MessageSquare className="w-4 h-4" />, label: "Messages" },
                    ].map(({ href, icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] transition-colors"
                        role="menuitem"
                      >
                        <span className="text-[var(--color-text-secondary)]">{icon}</span> {label}
                      </Link>
                    ))}
                    <div className="border-t border-[var(--color-bg-secondary)] mt-1 pt-1">
                      <button
                        onClick={() => { setShowUserMenu(false); setShowSignOutModal(true); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[#7a350b] transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
