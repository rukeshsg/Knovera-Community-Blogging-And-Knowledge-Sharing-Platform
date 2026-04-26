"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";
import { Search, Moon, Sun, LogOut, User, MessageSquare, Bookmark, ChevronDown, Settings, X } from 'lucide-react';

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
          <p className="text-sm text-[var(--color-text-secondary)]">You'll need to sign in again to access your account.</p>
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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
              <div className="relative h-10 w-36 flex items-center">
                <Image
                  src="/assets/knovera-logo.png"
                  alt="Knovera Logo"
                  fill
                  priority
                  sizes="144px"
                  className="dark:hidden object-contain object-left"
                />
                <Image
                  src="/assets/knovera-logo-white.png"
                  alt="Knovera Logo"
                  fill
                  priority
                  sizes="144px"
                  className="hidden dark:block object-contain object-left"
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
              <div className="absolute inset-0 bg-[var(--background)] flex items-center px-4 sm:px-6 lg:px-8 z-50">
                <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
                  <Search className="w-5 h-5 text-[var(--color-primary)]" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search stories, topics, or authors..."
                    className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-primary)] font-medium text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        window.location.href = `/explore?search=${encodeURIComponent(searchQuery.trim())}`;
                      }
                    }}
                  />
                  <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-[var(--color-bg-soft)] rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 hover:text-[var(--color-text-primary)] transition-colors" 
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            <NotificationBell />
            <button 
              onClick={toggleTheme}
              className="p-2 hover:text-[var(--color-text-primary)] transition-colors" 
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
                    <img src={session.user.image} alt="Profile" className="w-7 h-7 rounded-full ring-2 ring-[var(--color-primary)]/30" />
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
