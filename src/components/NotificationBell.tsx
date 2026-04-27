"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

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

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Poll for unread count every 30 seconds
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
          if (open) setNotifications(data.notifications);
        }
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id, open]);

  const handleOpen = async () => {
    if (!session) return;
    setOpen((o) => !o);
    if (!open) {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } finally {
        setLoading(false);
      }
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = async (id: string) => {
    setOpen(false);
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  if (!session) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="group flex items-center w-10 h-10 hover:w-[130px] rounded-full hover:bg-[var(--color-bg-soft)] transition-all duration-300 ease-in-out overflow-hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        aria-label="Notifications"
      >
        <div className="relative flex items-center justify-center shrink-0 w-10 h-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-[var(--color-primary)] text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-[var(--background)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm font-semibold transition-opacity duration-200 pr-4">
          Notifications
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-secondary)]">
              <h3 className="font-heading font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-text-secondary)] py-10">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n._id}
                    href={n.type === "MESSAGE" ? `/messages?with=${n.sender._id ?? ""}` : (n.post ? `/post/${n.post.slug}` : `/profile/${n.sender._id ?? ""}`)}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n._id);
                      else setOpen(false);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg-soft)] transition-colors border-b border-[var(--color-bg-secondary)] last:border-0 ${!n.isRead ? "bg-[var(--color-primary)]/5" : ""}`}
                  >
                    {n.sender.image ? (
                      <Image src={n.sender.image} alt={n.sender.name} width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold text-sm flex-shrink-0 mt-0.5">
                        {n.sender.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] leading-snug">{notificationText(n)}</p>
                      {n.post && <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">&quot;{n.post.title}&quot;</p>}
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1.5" />}
                  </Link>
                ))
              )}
            </div>

            <Link href="/notifications" onClick={() => setOpen(false)} className="block text-center text-xs font-medium text-[var(--color-primary)] py-3 hover:bg-[var(--color-bg-soft)] transition-colors border-t border-[var(--color-bg-secondary)]">
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
