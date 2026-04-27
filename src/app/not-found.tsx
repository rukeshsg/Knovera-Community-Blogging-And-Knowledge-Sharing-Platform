import Link from "next/link";
import { MoveLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-3xl rounded-full" />
        <Compass className="w-24 h-24 text-[var(--color-primary)] relative animate-pulse" />
      </div>
      
      <h1 className="text-8xl sm:text-9xl font-heading font-black text-[var(--color-text-primary)] mb-2 tracking-tighter">
        404
      </h1>
      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--color-text-primary)] mb-4">
        Page not found
      </h2>
      <p className="text-[var(--color-text-secondary)] max-w-md mb-10 leading-relaxed font-medium">
        The page you&apos;re looking for doesn&apos;t exist, was moved, or perhaps it just vanished into the creative void.
      </p>

      <Link 
        href="/" 
        className="flex items-center gap-2 px-8 py-4 bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-[#7a350b] transition-all shadow-xl shadow-[var(--color-primary)]/20 group"
      >
        <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Go Back Home
      </Link>
    </div>
  );
}
