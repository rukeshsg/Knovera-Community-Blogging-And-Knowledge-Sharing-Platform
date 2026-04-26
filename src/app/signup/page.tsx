"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }
      
      const loginRes = await signIn("credentials", { redirect: false, email, password });
      if (loginRes?.error) {
        throw new Error("Registration successful, but login failed.");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen -mt-16">
      {/* Left side: Premium Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 text-white flex-col justify-between p-12 relative overflow-hidden bg-black"
        style={{ backgroundImage: "url('/assets/auth-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        <div className="relative z-10">
          <Link href="/">
            <div className="relative h-12 w-[160px] mb-16">
              <Image 
                src="/assets/knovera-logo-white.png" 
                alt="Knovera Logo" 
                fill
                className="object-contain object-left"
              />
            </div>
          </Link>
          <h1 className="text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6">
            Where Ideas <br/>Connect and Grow.
          </h1>
          <p className="text-lg lg:text-xl opacity-90 max-w-md">
            Join a vibrant community of thinkers, writers, and learners. Share your knowledge and discover new perspectives today.
          </p>
        </div>
        
        <div className="relative z-10">
          <div className="flex -space-x-4 mb-4">
             <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white/20 backdrop-blur flex items-center justify-center font-bold text-sm">JS</div>
             <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white/30 backdrop-blur flex items-center justify-center font-bold text-sm">AL</div>
             <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white/40 backdrop-blur flex items-center justify-center font-bold text-sm">10k+</div>
          </div>
          <p className="font-medium text-sm opacity-90">Join thousands of curious minds.</p>
        </div>
        
        {/* Abstract decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-heading font-bold mb-2 text-[var(--color-primary)]">Create your account</h2>
            <p className="text-[var(--color-text-secondary)]">Welcome to Knovera. Let's get started.</p>
          </div>

          {error && <div className="text-red-500 mb-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm border border-red-100 dark:border-red-900/30">{error}</div>}
          
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]">Full Name</label>
              <input className="w-full p-3 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all" type="text" placeholder="John Doe" required value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]">Email Address</label>
              <input className="w-full p-3 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all" type="email" placeholder="john@example.com" required value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]">Password</label>
              <input className="w-full p-3 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all" type="password" placeholder="••••••••" required value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            
            <button disabled={loading} className="mt-2 bg-[var(--color-primary)] text-white p-3.5 rounded-lg hover:bg-[var(--color-primary-soft)] font-medium transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed" type="submit">
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="my-8 flex items-center justify-center gap-4">
            <span className="h-px bg-[var(--color-bg-secondary)] flex-1"></span>
            <span className="text-sm text-[var(--color-text-secondary)] font-medium">OR</span>
            <span className="h-px bg-[var(--color-bg-secondary)] flex-1"></span>
          </div>

          <button onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full bg-white dark:bg-zinc-800 text-black dark:text-white border border-[var(--color-bg-secondary)] p-3.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-3 font-medium transition-all shadow-sm">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="mt-8 text-center text-sm">
            <span className="text-[var(--color-text-secondary)]">Already have an account? </span>
            <Link href="/login" className="text-[var(--color-primary)] hover:text-[var(--color-primary-soft)] hover:underline font-medium transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
