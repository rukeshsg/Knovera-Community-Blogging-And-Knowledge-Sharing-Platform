# Knovera Project TODO List

## 🎨 Branding & Logo Requirements
**Single source of truth:** `assets/knovera-brand.png`
- **Logo Extraction:** Extract and use the logo exactly as shown in the image.
- **Strict Guidelines:** 
  - Do NOT modify the logo’s shape, proportions, typography, or icon.
  - Do NOT change colors, gradients, or layout.
  - Use the exact same logo for all UI placements (navbar, favicon, buttons, etc.).
- **Style Consistency:** Maintain precise consistency with the color palette (`#92400E` accent, `#FFFFFF` background, `#F5F5F4` cards) and overall style defined in the image.

---

## 🎯 MVP Scope
- **Authentication:** User registration, login, and secure sessions.
- **Posts (CRUD):** Creating, reading, updating, and deleting blog posts.
- **Comments:** Basic commenting on posts.
- **Basic Feed:** Chronological or basic feed display.

## 🚀 Advanced Features
- **Q&A System:** Asking questions, threaded answers, best answer selection.
- **Notifications:** In-app alerts for likes, follows, and mentions.
- **Admin Panel:** Content moderation, user bans, and analytics.
- **Real-Time Updates:** Socket.io integration for live notifications/comments.

---

## 🛠️ Development Order

### 1. Setup & Environment (MVP)
- [ ] Initialize Next.js project with App Router (`npx create-next-app@latest`)
- [ ] Configure Tailwind CSS with precise Knovera branding (`#92400E` accent, warm neutrals)
- [ ] Extract logo from `knovera-brand.png` to generate assets (favicon, nav logo, OpenGraph image)
- [ ] Set up MongoDB connection utility (Mongoose)
- [ ] Configure Cloudinary for image uploads
- [ ] Set up global state management (React Context or Zustand)

### 2. Authentication (MVP)
- [ ] Create User schema (`User`) with roles (User, Creator, Admin, Moderator)
- [ ] Implement user registration API with `bcrypt` password hashing
- [ ] Implement login API with JWT generation and cookies
- [ ] Build Frontend Auth forms (Login, Signup, Forgot Password)
- [ ] Implement email verification and password reset flow
- [ ] Add Next.js middleware for role-based route protection
- [ ] Build basic Profile schema, API, and UI (Bio, Links, Avatar)

### 3. Core Content: Posts & Q&A
**Posts (MVP Phase):**
- [ ] Create Post schema (`Post`) with tags, markdown content, drafts, and read time
- [ ] Build REST APIs for Post CRUD operations
- [ ] Implement rich text editor component for the Frontend (e.g., TipTap)
- [ ] Build Write Editor Page with auto-save and preview modes
- [ ] Build Post Detail Page with SSR/SSG

**Q&A System (Advanced Phase):**
- [ ] Create `Question` and `Answer` schemas
- [ ] Build API for asking questions and submitting answers
- [ ] Build Question Detail Page UI with answer threading
- [ ] Add "Mark as Best Answer" functionality

### 4. Interaction: Comments & Likes
**Comments (MVP Phase):**
- [ ] Create Comment schema supporting nested replies
- [ ] Build Comment CRUD APIs
- [ ] Build threaded Comment section UI for Posts

**Likes & Interactions (Advanced Phase):**
- [ ] Implement Post Like/Bookmark API and UI
- [ ] Implement Comment Like/Upvote functionality
- [ ] Implement Upvote/Downvote API for Q&A Answers
- [ ] Implement Repost/Share functionality

### 5. Feed & Discovery
**Basic Feed (MVP Phase):**
- [ ] Build Home Feed API (chronological sorting)
- [ ] Build minimal Feed UI

**Advanced Discovery (Advanced Phase):**
- [ ] Implement Follow/Unfollow API (Users and Topics)
- [ ] Update Feed API for algorithmic sorting (For You, Following, Trending)
- [ ] Implement MongoDB Text Search indexing for Posts and Questions
- [ ] Build global Search API endpoint and Search Results Page
- [ ] Build Topic & Community landing pages

### 6. Notifications (Advanced)
- [ ] Create Notification schema (Likes, Mentions, Follows)
- [ ] Build Notifications fetch and mark-as-read APIs
- [ ] Implement in-app Notification center/dropdown UI
- [ ] [ ] *(Optional)* Integrate Socket.io for real-time notifications

### 7. Admin & Moderation (Advanced)
- [ ] Implement Content Report API
- [ ] Build Admin/Moderator dashboard UI
- [ ] Implement Admin APIs (Ban user, Delete post/comment, Review reports)
- [ ] Add site-wide analytics tracking and display (Views, Reads)

---

## 🔌 External Services & APIs Required
- **MongoDB Atlas:** Database hosting
- **Cloudinary:** Image hosting (Avatars, Post covers, Markdown embedded images)
- **Email Provider (SendGrid / Resend):** For transactional emails (auth verification, password resets)
- **Vercel / Render:** Deployment platform
- **Socket.io:** (Optional) Real-time features for chat or live notifications

## 🔐 Environment Variables
Create a `.env.local` file with the following keys:

```env
# MongoDB Connection String (Get from MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/knovera

# Authentication (Generate strong random string)
JWT_SECRET=your_jwt_secret_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudinary - Image Uploads (Get from Cloudinary Dashboard)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service (Get from SendGrid/Resend)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@knovera.com
```
## 🔐 Post-Deployment (OAuth)
- [ ] Add production domain to Google OAuth
  - Origin: https://knovera.vercel.app
  - Redirect: https://knovera.vercel.app/api/auth/callback/google
- [ ] Keep localhost entries for development
- [ ] Set NEXTAUTH_URL / NEXT_PUBLIC_APP_URL to production URL