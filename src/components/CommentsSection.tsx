"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, Trash2, Reply, Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { safeJson } from "@/lib/api-utils";
import Link from "next/link";
import ErrorBoundary from "./ErrorBoundary";

interface Author { _id: string; name: string; image?: string; }
interface Reply { _id: string; author: Author; content: string; createdAt: string; likes: string[]; isDeleted: boolean; }
interface Comment { _id: string; author: Author; content: string; createdAt: string; likes: string[]; isDeleted: boolean; replies: Reply[]; }

function Avatar({ user }: { user: Author }) {
  return user.image ? (
    <img src={user.image} alt={user.name} className="w-10 h-10 rounded-2xl object-cover flex-shrink-0 shadow-sm" />
  ) : (
    <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-black text-sm flex-shrink-0">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function CommentItem({
  comment, postId, currentUserId, onDelete, isReply = false
}: {
  comment: Comment | Reply; postId: string; currentUserId?: string; onDelete: (id: string) => void; isReply?: boolean;
}) {
  const [liked, setLiked] = useState(comment.likes.includes(currentUserId ?? ""));
  const [likeCount, setLikeCount] = useState(comment.likes.length);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<Reply[]>("replies" in comment ? comment.replies : []);

  const handleLike = async () => {
    if (!currentUserId) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    try {
      const res = await fetch(`/api/comments/${comment._id}`, { method: "POST" });
      const data = await safeJson(res);
      if (res.ok && data) {
        setLiked(data.liked); 
        setLikeCount(data.count);
        return;
      }
      // Fallback if not ok or not json
      setLiked(prevLiked); 
      setLikeCount(prevCount);
    } catch {
      setLiked(prevLiked); 
      setLikeCount(prevCount);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentCommentId: comment._id }),
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setReplies((prev) => [data.comment, ...prev]); 
        setReplyText(""); 
        setShowReply(false); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (comment.isDeleted && (!("replies" in comment) || (comment as Comment).replies.length === 0)) return null;

  return (
    <div className={`flex gap-4 ${isReply ? "ml-14 mt-4" : ""}`}>
      <Avatar user={comment.author} />
      <div className="flex-1 min-w-0">
        <div className="bg-[var(--color-bg-soft)] rounded-2xl px-5 py-4 border border-[var(--color-bg-secondary)]/30 group relative">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--color-text-primary)]">{comment.author.name}</span>
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-tighter opacity-60">
                {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            {currentUserId === comment.author._id && !comment.isDeleted && (
              <button 
                onClick={() => onDelete(comment._id)} 
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className={`text-[15px] leading-relaxed ${comment.isDeleted ? "italic text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}>
            {comment.content}
          </p>
        </div>
        
        <div className="flex items-center gap-5 mt-2 ml-2">
          <button 
            onClick={handleLike} 
            disabled={!currentUserId} 
            className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${liked ? "text-red-500" : "text-[var(--color-text-secondary)] hover:text-red-500"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500" : ""}`} /> {likeCount > 0 ? likeCount : "Like"}
          </button>
          
          {!isReply && currentUserId && (
            <button 
              onClick={() => setShowReply(!showReply)} 
              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all"
            >
              <Reply className="w-3.5 h-3.5" /> {showReply ? "Cancel" : "Reply"}
            </button>
          )}
        </div>

        {showReply && (
          <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex-1 relative">
                <input
                   className="w-full text-sm px-4 py-3 rounded-xl border border-[var(--color-bg-secondary)] bg-[var(--background)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all"
                   placeholder={`Reply to ${comment.author.name.split(' ')[0]}...`}
                   value={replyText}
                   onChange={(e) => setReplyText(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                />
             </div>
            <button 
              onClick={handleReply} 
              disabled={submitting || !replyText.trim()} 
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#7a350b] disabled:opacity-50 transition-all shadow-lg shadow-[var(--color-primary)]/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
            </button>
          </div>
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="space-y-4">
            {replies.map((reply) => (
              <CommentItem key={reply._id} comment={reply} postId={postId} currentUserId={currentUserId} onDelete={onDelete} isReply />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentsSection({ postId, initialComments }: { postId: string; initialComments: Comment[] }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [totalCount, setTotalCount] = useState(initialComments.length);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialComments.length >= 10);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setComments((prev) => [data.comment, ...prev]); 
        setText(""); 
        setTotalCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/posts/${postId}/comments?page=${nextPage}`);
      const data = await safeJson(res);
      if (res.ok && data) {
        setComments((prev) => [...prev, ...data.comments]);
        setPage(nextPage);
        setHasMore(data.hasMore);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.map((c) =>
        c._id === commentId ? { ...c, isDeleted: true, content: "[deleted]" } : c
      ));
    }
  };

  return (
    <ErrorBoundary>
      <div className="mt-20 pt-12 border-t border-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-3 mb-10">
          <MessageSquare className="w-6 h-6 text-[var(--color-primary)]" />
          <h2 className="text-2xl font-heading font-black text-[var(--color-text-primary)]">
            Discussions <span className="ml-2 text-sm font-bold text-[var(--color-text-secondary)] opacity-40 uppercase tracking-widest">{totalCount}</span>
          </h2>
        </div>

        {/* Compose */}
        {session ? (
          <form onSubmit={handleSubmit} className="mb-14 group">
            <div className="flex gap-4">
              <Avatar user={{ _id: session.user?.id ?? "", name: session.user?.name ?? "?", image: session.user?.image ?? undefined }} />
              <div className="flex-1 flex flex-col gap-3">
                <textarea
                  className="w-full px-5 py-4 text-[15px] rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 resize-none transition-all duration-300"
                  placeholder="Join the conversation..."
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={submitting || !text.trim()} 
                    className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#7a350b] disabled:opacity-50 transition-all shadow-xl shadow-[var(--color-primary)]/20 flex items-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : "Post Discussion"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-8 mb-14 rounded-[32px] bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] border-dashed text-center">
            <p className="text-sm font-bold text-[var(--color-text-secondary)]">
              Discovering thoughts? <Link href="/login" className="text-[var(--color-primary)] hover:underline ml-1">Sign in to Knovera</Link> to join the conversation.
            </p>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-10">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              postId={postId}
              currentUserId={session?.user?.id}
              onDelete={handleDelete}
            />
          ))}
          
          {hasMore && (
            <div className="flex justify-center pt-6">
              <button 
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 bg-[var(--background)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-xs font-black uppercase tracking-widest rounded-2xl hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                Load more discussions
              </button>
            </div>
          )}

          {comments.length === 0 && (
            <div className="text-center py-16 opacity-40">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No discussions yet</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
