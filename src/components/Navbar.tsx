"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Search, Bell, User, Moon, LogOut } from 'lucide-react';
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--color-bg-secondary)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-11 w-[162px] flex items-center">
              <Image
                src="/assets/knovera-logo.png"
                alt="Knovera Logo"
                fill
                className="dark:hidden object-contain object-left transform scale-150 origin-left"
              />
              <Image
                src="/assets/knovera-logo-white.png"
                alt="Knovera Logo"
                fill
                className="hidden dark:block object-contain object-left transform scale-150 origin-left"
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
          <button className="p-2 hover:text-[var(--color-text-primary)] transition-colors" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 hover:text-[var(--color-text-primary)] transition-colors" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-2 hover:text-[var(--color-text-primary)] transition-colors" aria-label="Toggle Theme">
            <Moon className="h-5 w-5" />
          </button>

          {session ? (
            <div className="flex items-center gap-1">
              <Link href="/profile" className="p-2 hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2" aria-label="Profile">
                {session.user?.image ? (
                  <img src={session.user.image} alt="Profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="h-5 w-5 text-[var(--color-primary)]" />
                )}
              </Link>
              <button onClick={() => signOut()} className="p-2 hover:text-red-500 transition-colors" aria-label="Sign out" title="Sign Out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded hover:bg-[var(--color-primary-soft)] transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
