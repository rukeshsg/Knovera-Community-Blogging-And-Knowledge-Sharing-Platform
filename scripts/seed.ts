// Run: npx ts-node --project tsconfig.json scripts/seed.ts
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGO_URI = process.env.MONGODB_URI!;

// ── Schemas ──────────────────────────────────────────────
const UserSchema = new mongoose.Schema({ name: String, email: String, password: String, image: String, role: String, followers: [mongoose.Schema.Types.ObjectId], following: [mongoose.Schema.Types.ObjectId], bookmarks: [mongoose.Schema.Types.ObjectId], profile: { bio: String, socialLinks: { website: String, twitter: String, github: String } } }, { timestamps: true });
const PostSchema = new mongoose.Schema({ title: String, slug: String, content: String, author: mongoose.Schema.Types.ObjectId, coverImage: String, tags: [String], isPublished: Boolean, readTime: Number, views: Number, likes: [mongoose.Schema.Types.ObjectId], bookmarks: [mongoose.Schema.Types.ObjectId], shares: Number }, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);

const users = [
  { name: "Arjun Sharma", email: "arjun@knovera.com", bio: "Full-stack dev & coffee enthusiast", twitter: "arjunsharma", github: "arjundev" },
  { name: "Priya Patel", email: "priya@knovera.com", bio: "UI/UX Designer crafting beautiful experiences", twitter: "priyauxd", github: "priyaui" },
  { name: "Rahul Mehta", email: "rahul@knovera.com", bio: "Open source contributor & Linux nerd", twitter: "rahullinux", github: "rahulmehta" },
  { name: "Sneha Nair", email: "sneha@knovera.com", bio: "Machine learning researcher at IIT", twitter: "snehaaml", github: "snehainair" },
  { name: "Karthik Raj", email: "karthik@knovera.com", bio: "Startup founder | 3x exits | angel investor", twitter: "karthikraj" , github: "karthikbuilds" },
  { name: "Ananya Krishnan", email: "ananya@knovera.com", bio: "Science writer & educator", twitter: "ananyawrites", github: "ananyak" },
  { name: "Dev Malhotra", email: "dev@knovera.com", bio: "Security researcher & ethical hacker", twitter: "devhacks", github: "devmalhotra" },
  { name: "Nisha Gupta", email: "nisha@knovera.com", bio: "Product manager building the future of fintech", twitter: "nishapm", github: "nishagupta" },
  { name: "Vikram Singh", email: "vikram@knovera.com", bio: "Blockchain developer & crypto writer", twitter: "vikramchain", github: "vikramsingh" },
  { name: "Meera Iyer", email: "meera@knovera.com", bio: "Philosophy grad turned software engineer", twitter: "meeracodes", github: "meeraiyer" },
  { name: "Aditya Kumar", email: "aditya@knovera.com", bio: "Game dev & indie hacker", twitter: "adityagames", github: "adityakumar" },
  { name: "Riya Bose", email: "riya@knovera.com", bio: "Digital nomad & travel blogger", twitter: "riyatravels", github: "riyabose" },
];

const posts = [
  { title: "Why TypeScript Will Replace JavaScript Completely", tags: ["typescript", "javascript", "webdev"], content: "<h2>The Rise of TypeScript</h2><p>TypeScript has seen explosive adoption over the past few years. From small startups to tech giants like Microsoft and Google, everyone is migrating their codebases. But why? The answer lies in type safety, developer experience, and long-term maintainability.</p><h2>The Key Benefits</h2><p>Static typing catches bugs at compile time rather than runtime. This alone saves teams hundreds of hours in debugging. Add IntelliSense autocompletion, refactoring support, and self-documenting code, and you have a developer experience that's simply unmatched.</p><h2>The Counter-argument</h2><p>Critics argue TypeScript adds boilerplate. But modern TypeScript with inference is remarkably concise. The DX improvements far outweigh the verbosity.</p>", views: 1240, coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800" },
  { title: "Building a Startup from Zero: My First 100 Days", tags: ["startup", "entrepreneurship", "business"], content: "<h2>Day 1: The Idea</h2><p>Every startup begins with a problem worth solving. Mine started with a simple frustration — there was no good tool for async team communication that didn't feel like email or Slack.</p><h2>Finding Customers</h2><p>The first 30 days were about validation. I spoke to 50 potential users before writing a single line of code. 80% confirmed the pain point was real and recurring.</p><h2>Building the MVP</h2><p>Days 31-70 were intense. I built a minimal product — just enough to test the core hypothesis. No landing page, no analytics, just a working prototype shared with 10 beta testers.</p>", views: 3450, coverImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800" },
  { title: "Machine Learning Explained for Non-Technologists", tags: ["ai", "machinelearning", "beginners"], content: "<h2>What is Machine Learning?</h2><p>Imagine teaching a child to recognize cats. You don't write rules — you show them thousands of pictures. Machine learning works the same way. We show computers millions of examples and they learn patterns.</p><h2>Supervised vs Unsupervised Learning</h2><p>In supervised learning, we provide labelled data. The model learns the mapping from input to output. Unsupervised learning finds hidden structure in unlabelled data — like clustering customers by behaviour.</p><h2>Real World Applications</h2><p>From Netflix recommendations to medical diagnosis, ML is everywhere. The key insight is that these systems improve with more data — they literally get smarter over time.</p>", views: 2100, coverImage: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800" },
  { title: "The Psychology of Good UI Design", tags: ["design", "ux", "psychology"], content: "<h2>Design is Communication</h2><p>Every visual decision communicates something to the user. Color, spacing, typography — these aren't aesthetic choices, they're functional ones that directly impact usability and conversion.</p><h2>Hick's Law</h2><p>The more choices you present, the longer it takes to decide. Great UI design reduces cognitive load by simplifying decision trees. Apple's product pages are a masterclass in this.</p><h2>The F-Pattern</h2><p>Eye-tracking studies show users read in an F-shape. Put your most important content in the top-left. Navigation, CTAs, and key text should all follow this natural reading flow.</p>", views: 1780, coverImage: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800" },
  { title: "Ethereum vs Solana: Which Blockchain Wins in 2025?", tags: ["blockchain", "crypto", "web3"], content: "<h2>The Blockchain Trilemma</h2><p>Security, scalability, and decentralization — you can only fully optimize two. Ethereum prioritizes security and decentralization. Solana bets on speed and scalability, with some tradeoffs.</p><h2>Transaction Speeds</h2><p>Ethereum Layer 1 handles ~15 TPS. With Layer 2 rollups, this scales to thousands. Solana claims 65,000 TPS but has faced outages raising reliability concerns.</p><h2>Developer Ecosystem</h2><p>Ethereum wins hands down on tooling, documentation, and developer community. Solana is catching up fast but still has years to go.</p>", views: 4200, coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800" },
  { title: "Remote Work Changed My Life (And Not How You Think)", tags: ["remotework", "productivity", "lifestyle"], content: "<h2>The First Month Was Terrible</h2><p>I thought remote work meant freedom. What I got was isolation, anxiety, and working 12 hours a day because I couldn't 'leave the office'. The always-on culture was brutal.</p><h2>Systems That Saved Me</h2><p>The turning point was creating hard boundaries. 9am-6pm only. A dedicated workspace. Morning walks. Weekly video calls with the team. Suddenly remote work became the gift I expected.</p><h2>What Nobody Tells You</h2><p>You need to be intentional about everything — communication, social interaction, exercise. The office provided these by default. Now you build them yourself.</p>", views: 5670, coverImage: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800" },
  { title: "How I Learned to Code at 35 and Got a Senior Dev Job", tags: ["coding", "career", "motivation"], content: "<h2>It Started With a Lay-off</h2><p>I was 35, a marketing manager, when my company downsized. Instead of finding another marketing job, I decided to learn programming — something I'd always wanted to do.</p><h2>The 18-Month Journey</h2><p>I studied 3 hours every morning before my family woke up. JavaScript, React, Node. I built 12 projects. Failed 4 technical interviews. Then got offers from 3 companies simultaneously.</p><h2>What Actually Matters</h2><p>Nobody cared about my age. They cared about my portfolio, my problem-solving ability, and my communication skills — ironically refined by years in marketing.</p>", views: 8900, coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800" },
  { title: "The Philosophy of Open Source Software", tags: ["opensource", "philosophy", "tech"], content: "<h2>Software as a Public Good</h2><p>Richard Stallman's radical idea was simple: software should be free — not free as in price, but free as in freedom. The right to study, modify, and share code. This philosophy created Linux, the internet's backbone.</p><h2>Why Companies Contribute</h2><p>It seems paradoxical — why would corporations give away competitive advantages? The answer is network effects. A rising tide lifts all boats. When the ecosystem thrives, everyone benefits.</p>", views: 1100, coverImage: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800" },
  { title: "Next.js 15: Everything You Need to Know", tags: ["nextjs", "react", "webdev"], content: "<h2>The App Router is Now Default</h2><p>Next.js 15 doubles down on the App Router paradigm. Server Components are first-class citizens, dramatically reducing client-side JavaScript and improving Time to First Byte.</p><h2>Breaking Changes</h2><p>params and searchParams are now Promises that must be awaited in Server Components. Cookie handling is now async. These changes improve security but require migration effort.</p><h2>Turbopack Stable</h2><p>The new Rust-based bundler is now stable for development builds, promising up to 10x faster HMR compared to webpack.</p>", views: 6300, coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800" },
  { title: "India's Space Program: From PSLV to Chandrayaan", tags: ["space", "india", "science"], content: "<h2>Humble Beginnings</h2><p>ISRO started with scientists carrying rocket parts on bicycles. Decades later, India became the fourth nation to land on the Moon — and the first to land near the south pole with Chandrayaan-3.</p><h2>Cost Efficiency</h2><p>India's Mars mission Mangalyaan cost less than the Hollywood movie 'The Martian'. ISRO's frugal engineering philosophy delivers world-class results at a fraction of NASA's budget.</p>", views: 7800, coverImage: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800" },
  { title: "Building Accessible Web Apps: A Practical Guide", tags: ["accessibility", "webdev", "a11y"], content: "<h2>Why Accessibility Matters</h2><p>1 in 5 people has some form of disability. Inaccessible web apps exclude millions of users — and expose companies to legal liability. But beyond compliance, accessibility makes apps better for everyone.</p><h2>The WCAG Framework</h2><p>Web Content Accessibility Guidelines define four principles: Perceivable, Operable, Understandable, Robust. WCAG 2.1 AA compliance is the standard target for most applications.</p><h2>Quick Wins</h2><p>Semantic HTML, adequate color contrast, keyboard navigation, and ARIA labels. These four fundamentals cover 80% of accessibility requirements.</p>", views: 1450, coverImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800" },
  { title: "The Dark Side of Social Media Algorithms", tags: ["socialmedia", "tech", "society"], content: "<h2>Engagement at Any Cost</h2><p>Social media platforms optimize for one metric above all: engagement. Time on app. Clicks. Shares. The problem is that outrage, fear, and controversy drive more engagement than joy or nuance.</p><h2>The Filter Bubble Problem</h2><p>Algorithms learn your preferences and show you more of the same. Over time, you exist in an information bubble, seeing only content that reinforces your existing beliefs. Critical thinking atrophies.</p>", views: 9200, coverImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800" },
  { title: "How to Write Code That Doesn't Make You Hate Yourself", tags: ["coding", "cleancode", "bestpractices"], content: "<h2>Naming is Everything</h2><p>The hardest part of programming isn't algorithms — it's naming things. A well-named function is self-documenting. getUserById() tells you everything. doStuff() tells you nothing. Spend time on names.</p><h2>Small Functions, Single Responsibility</h2><p>Functions should do one thing and do it well. If you need to write 'and' in a function's description, split it. Small, focused functions are testable, readable, and reusable.</p>", views: 3300, coverImage: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800" },
  { title: "Meditation Changed My Engineering Career", tags: ["mindfulness", "productivity", "career"], content: "<h2>The Burnout</h2><p>Three years into my first engineering job, I was burnt out. 60-hour weeks, constant context switching, and an inner critic that never rested. I was productive by all external measures and miserable internally.</p><h2>10 Minutes That Changed Everything</h2><p>A colleague suggested meditation. I was skeptical — I was an engineer, not a monk. But 10 minutes of focused breathing daily, for 30 days, measurably changed my ability to concentrate and regulate stress.</p>", views: 4100, coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
  { title: "GraphQL vs REST: Making the Right Choice", tags: ["graphql", "api", "backend"], content: "<h2>REST's Strengths</h2><p>REST is simple, well-understood, and works brilliantly for most use cases. HTTP caching, stateless architecture, and widespread tooling support make it the default choice for public APIs.</p><h2>Where GraphQL Shines</h2><p>When clients need flexible data fetching — mobile apps with limited bandwidth, dashboards with complex requirements — GraphQL eliminates over-fetching and under-fetching in a single request.</p><h2>The Hybrid Approach</h2><p>Many production systems use both. Public API in REST, internal service communication in GraphQL. Use the right tool for the job.</p>", views: 2900, coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800" },
  { title: "Climate Tech: The Startups Building Our Future", tags: ["climatetech", "sustainability", "startup"], content: "<h2>The Trillion Dollar Opportunity</h2><p>Climate change is the defining challenge of our era, and it represents the largest economic opportunity in human history. Trillions will flow into clean energy, carbon capture, and sustainable agriculture over the next decade.</p><h2>Startups Leading the Charge</h2><p>From direct air capture (Climeworks) to lab-grown meat (Impossible Foods) to grid-scale batteries (Form Energy), entrepreneurs are building the infrastructure of a post-carbon economy.</p>", views: 3800, coverImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800" },
  { title: "The Art of Code Review: Giving Feedback That Helps", tags: ["codereview", "teamwork", "engineering"], content: "<h2>Code Review is About Learning, Not Judgment</h2><p>The best code reviews I've received weren't the ones that found the most bugs — they were the ones that made me a better engineer. Frame feedback as learning opportunities, not criticisms.</p><h2>Be Specific, Be Kind</h2><p>Vague feedback like 'this is confusing' is useless. Specific feedback like 'this function handles three concerns — consider splitting it because of X' gives the author actionable direction.</p>", views: 1670, coverImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800" },
  { title: "Docker & Kubernetes for Absolute Beginners", tags: ["docker", "kubernetes", "devops"], content: "<h2>What is Containerization?</h2><p>Before containers, 'it works on my machine' was every developer's nightmare. Docker solved this by packaging your application with all its dependencies into a portable container that runs identically anywhere.</p><h2>Enter Kubernetes</h2><p>When you have hundreds of containers running in production, you need orchestration. Kubernetes automates deployment, scaling, and management. It's complex, but so is running a distributed system.</p>", views: 5500, coverImage: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800" },
  { title: "Reading 52 Books in a Year: What I Learned", tags: ["books", "learning", "productivity"], content: "<h2>The System</h2><p>One book a week sounds impossible until you replace social media scrolling with reading. 30 minutes morning, 30 minutes evening. That's enough for most books in a week. The key is consistency, not speed.</p><h2>What Changed</h2><p>My vocabulary expanded, my writing improved, and I started connecting ideas across domains. Reading widely makes you think better. The ROI is extraordinary.</p>", views: 6700, coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800" },
  { title: "PostgreSQL Performance Tuning: A Deep Dive", tags: ["postgresql", "database", "backend"], content: "<h2>Indexes Are Not Magic</h2><p>A common misconception: add an index and queries get faster. Reality: wrong indexes slow writes and bloat storage. Use EXPLAIN ANALYZE to understand query plans before adding indexes.</p><h2>Connection Pooling</h2><p>PostgreSQL creates a process per connection. With hundreds of concurrent users, this crushes performance. PgBouncer or connection pooling in your ORM is non-negotiable at scale.</p>", views: 2200, coverImage: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800" },
  { title: "The Future of Work: AI Won't Replace You, But...", tags: ["ai", "future", "career"], content: "<h2>The Real Threat</h2><p>AI won't replace software engineers. But a software engineer who uses AI effectively will replace one who doesn't. The productivity gap between AI-augmented and non-augmented workers is already measurable and growing.</p><h2>Skills That Remain Human</h2><p>Critical thinking, system design, stakeholder communication, ethical judgment — these are hard to automate. Double down on them. Let AI handle the repetitive parts of your job.</p>", views: 12400, coverImage: "https://images.unsplash.com/photo-1717501218636-a390f9ac5957?w=800" },
  { title: "How Ayurveda and Modern Science Are Converging", tags: ["health", "science", "wellness"], content: "<h2>Ancient Wisdom Meets Empiricism</h2><p>Turmeric's anti-inflammatory properties, ashwagandha's cortisol-reducing effects, triphala's gut health benefits — these aren't just folk wisdom anymore. Rigorous clinical studies are validating what Ayurvedic practitioners have known for centuries.</p><h2>The Integration Challenge</h2><p>The challenge is standardization. Traditional formulations vary by practitioner. Modern medicine demands reproducibility. Bridging this gap requires collaboration between traditions, not competition.</p>", views: 3100, coverImage: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800" },
  { title: "Zero to $10K MRR with a SaaS Micro-Product", tags: ["saas", "startup", "indiehacker"], content: "<h2>The Idea</h2><p>I built a niche invoicing tool for Indian freelancers with GST compliance built-in. No VC funding, no co-founder, just a problem I personally experienced and a weekend to validate it.</p><h2>The Numbers</h2><p>Month 1: 5 paying customers at ₹499/mo. Month 6: 180 customers at ₹799/mo. The key was laser focus on one problem for one specific audience, not building for everyone.</p>", views: 8800, coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800" },
  { title: "Why I Switched from VS Code to Neovim", tags: ["neovim", "productivity", "tools"], content: "<h2>The Setup Cost</h2><p>I won't lie — configuring Neovim took 40 hours. Lua scripting, LSP configuration, plugin management. It's not for everyone. But for someone who spends 8 hours a day in an editor, the payoff is worth it.</p><h2>The Productivity Gain</h2><p>Once muscle memory kicks in, modal editing is faster than anything else. My hands rarely leave the keyboard. Navigation, refactoring, search — all keyboard-driven. It's a different way of thinking about code.</p>", views: 4400, coverImage: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800" },
  { title: "Building Your Personal Brand as a Developer", tags: ["career", "personalbrand", "social"], content: "<h2>Why It Matters</h2><p>Two developers with equal skills. One has a strong online presence — a blog, GitHub activity, Twitter engagement. The other has nothing. Who gets the better job offers, speaking invitations, and consulting opportunities? The answer is obvious.</p><h2>Start Small</h2><p>You don't need 10,000 followers to benefit from a personal brand. 500 engaged followers in your niche is worth more than 50,000 random ones. Write about what you're learning. Be consistent. The audience follows.</p>", views: 5100, coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Clear existing seed data
  await User.deleteMany({ email: { $regex: "@knovera.com$" } });
  console.log("🗑  Cleared old seed users");

  const password = await bcrypt.hash("Knovera@2025", 10);
  const avatarBase = "https://ui-avatars.com/api/?background=random&size=128&name=";

  const createdUsers = await User.insertMany(
    users.map((u) => ({
      name: u.name,
      email: u.email,
      password,
      image: `${avatarBase}${encodeURIComponent(u.name)}`,
      role: "user",
      followers: [],
      following: [],
      bookmarks: [],
      profile: { bio: u.bio, socialLinks: { twitter: u.twitter || "", github: u.github || "" } },
    }))
  );
  console.log(`👥 Created ${createdUsers.length} users`);

  // Delete old seed posts by slug patterns
  const seedSlugs = posts.map((p) => slugify(p.title));
  await Post.deleteMany({ slug: { $in: seedSlugs } });

  const postDocs = posts.map((p, i) => ({
    title: p.title,
    slug: slugify(p.title),
    content: p.content,
    author: createdUsers[i % createdUsers.length]._id,
    coverImage: p.coverImage,
    tags: p.tags,
    isPublished: true,
    readTime: Math.max(1, Math.ceil(p.content.replace(/<[^>]+>/g, "").split(/\s+/).length / 200)),
    views: p.views,
    likes: createdUsers.slice(0, Math.floor(Math.random() * 6)).map((u) => u._id),
    bookmarks: [],
    shares: Math.floor(Math.random() * 50),
  }));

  await Post.insertMany(postDocs);
  console.log(`📝 Created ${postDocs.length} posts`);

  console.log("\n🎉 Seed complete!\n");
  console.log("📋 User credentials (all same password):");
  console.log("   Password: Knovera@2025");
  createdUsers.forEach((u: any) => console.log(`   ${u.email}`));

  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
