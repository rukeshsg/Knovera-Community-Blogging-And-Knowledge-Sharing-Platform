"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2, RefreshCcw } from "lucide-react";

interface Notification {
  _id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender: { _id?: string; name: string; image?: string };
  post?: { title: string; slug: string };
}

function notificationText(n: Notification) {
  switch (n.type) {
    case "LIKE_POST": return `${n.sender.name} liked your post`;
    case "COMMENT_POST": return `${n.sender.name} commented on your post`;
    case "REPLY_COMMENT": return `${n.sender.name} replied to your comment`;
    case "FOLLOW": return `${n.sender.name} started following you`;
    case "BOOKMARK_POST": return `${n.sender.name} bookmarked your post`;
    case "MESSAGE": return `${n.sender.name} sent you a message request`;
    default: return `${n.sender.name} interacted with your content`;
  }
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum: number, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/notifications?page=${pageNum}`);
      const data = await res.json();
      
      if (res.ok) {
        if (isInitial) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications((prev) => [...prev, ...(data.notifications || [])]);
        }
        setUnreadCount(data.unreadCount || 0);
        if ((data.notifications?.length || 0) < 20) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchNotifications(1, true);
  }, [session, fetchNotifications]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({}) 
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Bell className="w-8 h-8 text-[var(--color-text-secondary)]" />
        </div>
        <h2 className="text-2xl font-heading font-black mb-4">Stay updated</h2>
        <p className="text-[var(--color-text-secondary)] mb-8">Sign in to see likes, comments, and other interactions on your posts.</p>
        <Link href="/login" className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[#7a350b] transition-all shadow-lg shadow-[var(--color-primary)]/20">
          Sign In to Knovera
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-8 h-8 text-[var(--color-primary)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-[var(--background)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-heading font-black text-[var(--color-text-primary)]">Activity</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setPage(1); setHasMore(true); fetchNotifications(1, true); }}
            className="p-2.5 bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
            title="Refresh"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead} 
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-all uppercase tracking-widest"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-bg-soft)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-3xl bg-[var(--color-bg-soft)]/30">
          <div className="w-20 h-20 bg-[var(--color-bg-secondary)]/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-10 h-10 text-[var(--color-text-secondary)] opacity-40" />
          </div>
          <h3 className="text-2xl font-heading font-black mb-2 text-[var(--color-text-primary)]">Quiet for now</h3>
          <p className="text-[var(--color-text-secondary)] max-w-xs mx-auto">Notifications will appear here when people engage with your content.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-3xl overflow-hidden shadow-sm">
            {notifications.map((n, i) => (
              <Link
                key={`${n._id}-${i}`}
                href={n.type === "MESSAGE" ? `/messages?with=${n.sender._id ?? ""}` : (n.post ? `/post/${n.post.slug}` : (n.sender._id ? `/profile/${n.sender._id}` : "#"))}
                className={`flex items-start gap-4 px-6 py-5 transition-all hover:bg-[var(--color-bg-soft)] ${!n.isRead ? "bg-[var(--color-primary)]/5 border-l-4 border-l-[var(--color-primary)] pl-5" : "pl-6"} ${i < notifications.length - 1 ? "border-b border-[var(--color-bg-secondary)]/50" : ""}`}
              >
                {n.sender.image ? (
                  <img src={n.sender.image} alt={n.sender.name} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 mt-0.5 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-black text-lg flex-shrink-0 mt-0.5">
                    {n.sender.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed">
                    <span className="font-bold">{n.sender.name}</span> {notificationText(n).replace(n.sender.name, "")}
                  </p>
                  {n.post && (
                    <p className="text-xs text-[var(--color-text-secondary)] truncate mt-1 bg-[var(--color-bg-soft)] px-2 py-1 rounded-md inline-block max-w-full italic font-medium">
                      "{n.post.title}"
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-2 font-bold uppercase tracking-widest opacity-60">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-2 shadow-lg shadow-[var(--color-primary)]/50" />}
              </Link>
            ))}
          </div>

          {hasMore && (
            <button 
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-4 mt-4 flex items-center justify-center gap-2 text-sm font-black text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all bg-[var(--color-bg-soft)] rounded-2xl border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)]"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading more...
                </>
              ) : (
                "Load more activity"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
