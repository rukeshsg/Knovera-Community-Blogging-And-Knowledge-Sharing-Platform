"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, ArrowLeft, MessageSquare, Check, X } from "lucide-react";

interface Message {
  _id: string;
  content: string;
  sender: { _id: string; name: string; image?: string };
  createdAt: string;
}
interface Conversation {
  _id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  requestedBy: string;
  other: { _id: string; name: string; image?: string };
  lastMessage?: { content: string; createdAt: string };
}

function Avatar({ user }: { user: { name: string; image?: string } }) {
  return user.image ? (
    <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--color-bg-secondary)] flex-shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold text-sm ring-2 ring-[var(--color-bg-secondary)] flex-shrink-0">
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
  const [activeTab, setActiveTab] = useState<"inbox" | "requests">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [actionLoading, setActionLoading] = useState<"accept" | "reject" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const withUserId = searchParams.get("with");

  const currentUserId = session?.user?.id;

  // Load conversations list and poll for updates
  useEffect(() => {
    if (!session) return;
    
    let isMounted = true;
    const fetchConvos = async (showLoading = false) => {
      if (showLoading) setLoadingConvos(true);
      try {
        const r = await fetch("/api/messages");
        if (!r.ok) return;
        const d = await r.json();
        if (isMounted) {
          setConversations(d.conversations ?? []);
        }
      } catch (err) {
        // ignore
      } finally {
        if (isMounted && showLoading) setLoadingConvos(false);
      }
    };

    fetchConvos(true);

    const intervalId = setInterval(() => {
      fetchConvos(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [session]);

  // Auto-open/create conversation from ?with= query param
  useEffect(() => {
    if (!withUserId || !session) return;
    
    // Prevent duplicate firing while request is in flight
    const initializeChat = async () => {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: withUserId, content: "" }), // Initialize only, no content
        });
        
        if (!res.ok) {
          console.error("Failed to initialize chat");
          return;
        }

        const d = await res.json();
        if (d.conversationId) {
          setActiveId(d.conversationId);
          // Refetch conversations list
          const convRes = await fetch("/api/messages");
          if (convRes.ok) {
            const d2 = await convRes.json();
            setConversations(d2.conversations ?? []);
          }
          router.replace("/messages");
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
    };
    
    initializeChat();
  }, [withUserId, session, router]);

  // Load messages when active conversation changes & poll for new messages
  useEffect(() => {
    if (!activeId) return;
    
    let isMounted = true;
    const fetchMsgs = async (showLoading = false) => {
      if (showLoading) setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages/${activeId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (isMounted) {
          setMessages(d.messages ?? []);
        }
      } catch (err) {
        // ignore fetch errors on poll
      } finally {
        if (isMounted && showLoading) setLoadingMessages(false);
      }
    };

    // Initial fetch
    setMessages([]);
    fetchMsgs(true);

    // Poll every 3 seconds for new messages
    const intervalId = setInterval(() => {
      fetchMsgs(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConvo = conversations.find((c) => c._id === activeId);

  const inboxConvos = conversations.filter(c => c.status === "ACCEPTED" || (c.status === "PENDING" && c.requestedBy === currentUserId));
  const requestConvos = conversations.filter(c => c.status === "PENDING" && c.requestedBy !== currentUserId);

  const displayedConvos = activeTab === "inbox" ? inboxConvos : requestConvos;

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
        _id: currentUserId ?? "",
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
        setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...data.message, sender: { ...data.message.sender, _id: data.message.sender._id?.toString() } } : m)));
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId ? { ...c, lastMessage: { content, createdAt: new Date().toISOString() } } : c
          )
        );
      } else {
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

  const handleAction = async (action: "accept" | "reject") => {
    if (!activeId || actionLoading) return;
    setActionLoading(action);

    try {
      const res = await fetch(`/api/messages/${activeId}/${action}`, { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        setConversations((prev) => 
          prev.map((c) => (c._id === activeId ? { ...c, status: data.status } : c))
        );
        if (action === "reject") {
          setActiveId(null);
        } else {
          setActiveTab("inbox"); // Move them back to inbox automatically
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
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
      <div className="flex h-[calc(100vh-64px)] sm:h-[75vh] bg-[var(--background)] sm:border border-[var(--color-bg-secondary)] sm:rounded-2xl overflow-hidden shadow-xl shadow-[var(--color-bg-secondary)]/50">

        {/* ── Sidebar: Conversations ── */}
        <div className={`${activeId ? "hidden sm:flex" : "flex"} w-full sm:w-80 flex-col border-r border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)]/20`}>
          <div className="p-4 border-b border-[var(--color-bg-secondary)]">
            <h2 className="font-heading font-black text-2xl text-[var(--color-text-primary)] mb-4">Messages</h2>
            <div className="flex bg-[var(--color-bg-secondary)] rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === "inbox" ? "bg-[var(--background)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
              >
                Inbox
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "requests" ? "bg-[var(--background)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
              >
                Requests 
                {requestConvos.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                    {requestConvos.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {loadingConvos ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : displayedConvos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mb-2">
                <MessageSquare className="w-6 h-6 text-[var(--color-text-secondary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {activeTab === "inbox" ? "No messages yet" : "No pending requests"}
              </p>
              {activeTab === "inbox" && (
                <Link href="/explore" className="text-xs text-[var(--color-primary)] font-bold uppercase tracking-wider hover:underline">
                  Find Community
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {displayedConvos.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setActiveId(c._id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-[var(--color-bg-soft)] transition-colors text-left border-b border-[var(--color-bg-secondary)] last:border-0 ${activeId === c._id ? "bg-[var(--background)] sm:border-l-4 sm:border-l-[var(--color-primary)]" : "sm:border-l-4 sm:border-l-transparent"}`}
                >
                  <Avatar user={c.other} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{c.other.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                      {c.lastMessage?.content ?? "Start a conversation"}
                    </p>
                  </div>
                  {c.status === "PENDING" && c.requestedBy === currentUserId && (
                     <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-md">Sent</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat Area ── */}
        <div className={`${activeId ? "flex" : "hidden sm:flex"} flex-1 flex-col relative`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)] gap-4">
              <div className="w-20 h-20 rounded-full bg-[var(--color-bg-soft)] border-2 border-dashed border-[var(--color-bg-secondary)] flex items-center justify-center">
                <MessageSquare className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-semibold text-sm">Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-secondary)] bg-[var(--background)]/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveId(null)} className="sm:hidden p-2 hover:text-[var(--color-primary)] transition-colors rounded-xl hover:bg-[var(--color-bg-soft)]">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {activeConvo && (
                    <Link href={`/profile/${activeConvo.other._id}`} className="flex items-center gap-3 group">
                      <Avatar user={activeConvo.other} />
                      <div>
                        <p className="font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
                          {activeConvo.other.name}
                        </p>
                        {activeConvo.status === "PENDING" && (
                           <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                             Pending Request
                           </p>
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[var(--background)] to-[var(--color-bg-soft)]/30">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--color-text-secondary)] mt-8 py-10 font-medium">
                    This is the beginning of your conversation with {activeConvo?.other.name}. Say hi! 👋
                  </p>
                ) : (
                  messages.filter(m => m.content.trim()).map((msg) => {
                    const isOwn = msg.sender._id === session.user?.id;
                    return (
                      <div key={msg._id} className={`flex items-end gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && <Avatar user={msg.sender} />}
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                          isOwn
                            ? "bg-[var(--color-primary)] text-white rounded-br-[4px]"
                            : "bg-[var(--background)] text-[var(--color-text-primary)] rounded-bl-[4px] border border-[var(--color-bg-secondary)]"
                        } ${msg._id.startsWith("temp-") ? "opacity-60" : ""}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Guarded Input Area */}
              <div className="p-4 border-t border-[var(--color-bg-secondary)] bg-[var(--background)]">
                {activeConvo?.status === "PENDING" && messages.length > 0 ? (
                  activeConvo.requestedBy === currentUserId ? (
                    <div className="bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-sm font-semibold rounded-2xl p-4 text-center">
                      Waiting for {activeConvo.other.name} to accept your request.
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction("reject")}
                        disabled={!!actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-[var(--color-bg-secondary)] bg-[var(--background)] text-[var(--color-text-secondary)] rounded-2xl text-sm font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Delete
                      </button>
                      <button
                        onClick={() => handleAction("accept")}
                        disabled={!!actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] text-white rounded-2xl text-sm font-bold hover:bg-[#7a350b] transition-colors shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
                      >
                         {actionLoading === "accept" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                      </button>
                    </div>
                  )
                ) : activeConvo?.status === "REJECTED" ? (
                    <div className="bg-[var(--color-bg-soft)] text-red-500 text-sm font-semibold rounded-2xl p-4 text-center">
                      You cannot reply to this conversation.
                    </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-4 py-3 text-[15px] border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] rounded-2xl outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all"
                      placeholder="Message..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="p-3.5 bg-[var(--color-primary)] text-white rounded-2xl hover:bg-[#7a350b] disabled:opacity-50 transition-colors flex-shrink-0 shadow-md shadow-[var(--color-primary)]/20"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
