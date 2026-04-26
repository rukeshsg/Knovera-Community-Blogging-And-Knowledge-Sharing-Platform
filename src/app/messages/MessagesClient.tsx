"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, ArrowLeft, MessageSquare } from "lucide-react";

interface Message {
  _id: string;
  content: string;
  sender: { _id: string; name: string; image?: string };
  createdAt: string;
}
interface Conversation {
  _id: string;
  other: { _id: string; name: string; image?: string };
  lastMessage?: { content: string; createdAt: string };
}

function Avatar({ user }: { user: { name: string; image?: string } }) {
  return user.image ? (
    <img src={user.image} alt={user.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {user.name.charAt(0)}
    </div>
  );
}

export default function MessagesClient() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const withUserId = searchParams.get("with");

  // Load conversations list
  useEffect(() => {
    if (!session) return;
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations ?? []);
        setLoadingConvos(false);
      })
      .catch(() => setLoadingConvos(false));
  }, [session]);

  // Auto-open/create conversation from ?with= query param
  useEffect(() => {
    if (!withUserId || !session) return;
    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: withUserId, content: "👋" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.conversationId) {
          setActiveId(d.conversationId);
          // Refresh conversation list
          fetch("/api/messages")
            .then((r) => r.json())
            .then((d2) => setConversations(d2.conversations ?? []));
          router.replace("/messages");
        }
      })
      .catch(() => {});
  }, [withUserId, session]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    setMessages([]);
    fetch(`/api/messages/${activeId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoadingMessages(false);
      })
      .catch(() => setLoadingMessages(false));
  }, [activeId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConvo = conversations.find((c) => c._id === activeId);

  const handleSend = async () => {
    if (!text.trim() || !activeConvo || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      _id: tempId,
      content,
      sender: {
        _id: session?.user?.id ?? "",
        name: session?.user?.name ?? "",
        image: session?.user?.image ?? undefined,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: activeConvo.other._id, content }),
      });
      const data = await res.json();
      if (res.ok) {
        // Replace temp with real message
        setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...data.message, sender: { ...data.message.sender, _id: data.message.sender._id?.toString() } } : m)));
        // Update conversation lastMessage
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId ? { ...c, lastMessage: { content, createdAt: new Date().toISOString() } } : c
          )
        );
      } else {
        // Revert optimistic
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setText(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">Sign in to view your messages.</p>
          <Link href="/login" className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#7a350b] transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
      <div className="flex h-[calc(100vh-64px)] sm:h-[75vh] bg-[var(--background)] sm:border border-[var(--color-bg-secondary)] sm:rounded-2xl overflow-hidden shadow-sm">

        {/* ── Sidebar: Conversations ── */}
        <div className={`${activeId ? "hidden sm:flex" : "flex"} w-full sm:w-72 flex-col border-r border-[var(--color-bg-secondary)]`}>
          <div className="p-4 border-b border-[var(--color-bg-secondary)]">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" /> Messages
            </h2>
          </div>

          {loadingConvos ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <MessageSquare className="w-10 h-10 text-[var(--color-text-secondary)] opacity-30" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                No conversations yet.<br />
                <Link href="/explore" className="text-[var(--color-primary)] hover:underline font-medium">Find someone to message</Link>
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setActiveId(c._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-soft)] transition-colors text-left border-b border-[var(--color-bg-secondary)] last:border-0 ${activeId === c._id ? "bg-[var(--color-primary)]/5 border-l-2 border-l-[var(--color-primary)]" : ""}`}
                >
                  <Avatar user={c.other} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{c.other.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {c.lastMessage?.content ?? "Start a conversation"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat Area ── */}
        <div className={`${activeId ? "flex" : "hidden sm:flex"} flex-1 flex-col`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)] gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="font-medium text-sm">Select a conversation to start</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-bg-secondary)]">
                <button onClick={() => setActiveId(null)} className="sm:hidden p-1.5 hover:text-[var(--color-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-soft)]">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {activeConvo && (
                  <>
                    <Avatar user={activeConvo.other} />
                    <Link href={`/profile/${activeConvo.other._id}`} className="font-semibold text-sm hover:text-[var(--color-primary)] transition-colors">
                      {activeConvo.other.name}
                    </Link>
                  </>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-bg-soft)]/30">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--color-text-secondary)] mt-8 py-10">
                    No messages yet. Say hi! 👋
                  </p>
                ) : (
                  messages.filter(m => m.content.trim()).map((msg) => {
                    const isOwn = msg.sender._id === session.user?.id;
                    return (
                      <div key={msg._id} className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && <Avatar user={msg.sender} />}
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOwn
                            ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                            : "bg-[var(--background)] text-[var(--color-text-primary)] rounded-bl-sm border border-[var(--color-bg-secondary)]"
                        } ${msg._id.startsWith("temp-") ? "opacity-60" : ""}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-[var(--color-bg-secondary)] flex gap-2 bg-[var(--background)]">
                <input
                  className="flex-1 px-4 py-2.5 text-sm border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] rounded-xl outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="p-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[#7a350b] disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
