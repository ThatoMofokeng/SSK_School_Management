# 🚀 Vercel Deployment Guide - Siyakha Student Management System

**Complete step-by-step guide to deploy your school management system to Vercel**

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [x] GitHub/GitLab/Bitbucket account
- [x] Vercel account (free tier works) - https://vercel.com/signup
- [x] Supabase database (or PostgreSQL provider)
- [x] Clerk account with **production** keys
- [x] All critical security fixes applied (see CRITICAL_FIXES_APPLIED.md)

---

## 🎯 Deployment Overview

```
Local Git → GitHub → Vercel → Production
                ↓
         Auto-deploy on push
```

---

## Step 1: Prepare Your Repository

### 1.1 Commit Your Changes (If Not Already)

```bash
# Check what files have changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: add security fixes (rate limiting, authorization, CSP headers)

- Add rate limiting to prevent abuse
- Fix authorization on student/teacher detail pages
- Add comprehensive security headers (CSP, HSTS, etc.)
- Create .env.example with safe placeholders
- Add full engineering audit documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 1.2 Push to GitHub

```bash
# If you haven't set up remote yet:
git remote add origin https://github.com/YOUR-USERNAME/SSK_School_Management.git

# Push to GitHub
git push -u origin main

# Or if your branch is named differently:
git push -u origin nkotolane-pitso
```

**⚠️ CRITICAL:** Before pushing, verify `.env` is NOT being committed:

```bash
git status | grep .env
# Should NOT show .env (only .env.example is OK)

# Double-check gitignore
grep "^\.env$" .gitignore
# Should output: .env
```

---

## Step 2: Set Up Vercel Project

### 2.1 Import Project from GitHub

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select **GitHub** (authorize Vercel if first time)
4. Find **SSK_School_Management** repository
5. Click **"Import"**

### 2.2 Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |
| **Root Directory** | `./` |

**DO NOT DEPLOY YET** - Click "Environment Variables" first.

---

## Step 3: Configure Environment Variables

### 3.1 Get Production Clerk Keys

**⚠️ CRITICAL: Use PRODUCTION keys, not test keys!**

1. Go to https://dashboard.clerk.com
2. **Switch to "Production" environment** (top dropdown)
3. Navigate to **API Keys**
4. Copy these values:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)

### 3.2 Get Database URLs from Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. **Settings** → **Database**
4. Scroll to **Connection String**
5. Copy:
   - **Connection Pooling (recommended)** → Use for `DATABASE_URL`
   - **Direct Connection** → Use for `DIRECT_URL`

**Format:**
```
DATABASE_URL=postgresql://postgres.[PROJECT]:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT]:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

### 3.3 Add Environment Variables in Vercel

In the Vercel import screen, click **"Environment Variables"** and add:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres...6543/postgres?pgbouncer=true` | Production, Preview, Development |
| `DIRECT_URL` | `postgresql://postgres...5432/postgres` | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_YOUR_KEY` | Production, Preview, Development |
| `CLERK_SECRET_KEY` | `sk_live_YOUR_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` | Production, Preview, Development |

**Tips:**
- Click "Add" after each variable
- Select all three environments (Production, Preview, Development) for each
- Double-check for typos - one wrong character breaks everything

### 3.4 Optional: Cloudinary (If Using Image Uploads)

If you're using Cloudinary for image uploads, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your cloud name |
| `CLOUDINARY_API_KEY` | Your API key |
| `CLOUDINARY_API_SECRET` | Your API secret |

---

## Step 4: Deploy!

### 4.1 Initial Deployment

1. After adding all environment variables
2. Click **"Deploy"**
3. ☕ Wait 2-3 minutes for build to complete

### 4.2 Monitor Build

Watch the build logs:
- ✅ Green checkmarks = success
- ❌ Red X = error (see troubleshooting below)

**Common build phases:**
1. Installing dependencies (`npm install`)
2. Running Prisma generate
3. Building Next.js app
4. Optimizing production build
5. Deploying to edge network

---

## Step 5: Configure Clerk for Production

### 5.1 Add Vercel Domain to Clerk

Your Vercel URL will be: `https://ssk-school-management-USERNAME.vercel.app`

1. Go to https://dashboard.clerk.com
2. Ensure you're in **Production** environment
3. Navigate to **Domains**
4. Click **"Add domain"**
5. Enter your Vercel domain: `ssk-school-management-USERNAME.vercel.app`
6. Save

### 5.2 Update Redirect URLs

In Clerk dashboard:
1. Go to **Paths**
2. Set **Sign-in URL**: `/sign-in`
3. Set **Sign-up URL**: `/sign-up` (if you add sign-up later)
4. Set **After sign-in URL**: `/`
5. Save changes

---

## Step 6: Run Database Migrations

### 6.1 Automatic Migration (Recommended)

Migrations run automatically on Vercel deployment via the build process. Verify by checking build logs:

```
✓ Prisma schema loaded
✓ Migrations deployed
✓ Database schema up to date
```

### 6.2 Manual Migration (If Needed)

If migrations didn't run automatically:

1. Go to Vercel Dashboard → Your Project → **Settings** → **General**
2. Scroll to **Build & Development Settings**
3. Add to **Build Command**:
   ```
   npx prisma generate && npx prisma migrate deploy && npm run build
   ```
4. Redeploy

### 6.3 Seed Database (Optional)

To populate with test data:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run seed script
vercel env pull .env.production
npx prisma db seed --preview-feature
```

---

## Step 7: Verify Deployment

### 7.1 Access Your App

Your app is now live at: `https://ssk-school-management-USERNAME.vercel.app`

### 7.2 Check Health

**Test these critical paths:**

1. **Homepage loads:**
   - Visit `https://your-app.vercel.app`
   - Should redirect to `/sign-in`

2. **Login works:**
   - Enter credentials
   - Should redirect to `/{role}` dashboard

3. **Database connected:**
   - Log in as admin
   - Go to `/list/students`
   - Should show student list (or empty if no data)

4. **Security headers active:**
   ```bash
   curl -I https://your-app.vercel.app | grep -i "x-frame-options"
   # Should output: X-Frame-Options: SAMEORIGIN
   ```

5. **Rate limiting works:**
   - Try creating 6 subjects rapidly
   - 6th should fail with rate limit error

### 7.3 Check Logs

In Vercel Dashboard:
1. Go to your project
2. Click **"Logs"** tab
3. Look for errors (should see none)

---

## Step 8: Set Up Custom Domain (Optional)

### 8.1 Add Your Domain in Vercel

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain: `school.yourdomain.com`
4. Follow DNS setup instructions

### 8.2 Update Clerk

1. Clerk Dashboard → **Domains**
2. Add your custom domain
3. Update redirect URLs if needed

### 8.3 Update Environment Variables

Update these in Vercel:
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# (Keep the same, just verify)
```

---

## 🔒 Post-Deployment Security Checklist

### Critical Security Items

- [ ] **Production Clerk keys** active (`pk_live_*`, not `pk_test_*`)
- [ ] **Database credentials** different from development
- [ ] **Security headers** active (verify with `curl -I`)
- [ ] **Rate limiting** works (test subject creation)
- [ ] **Authorization** enforced (teacher can't view unauthorized students)
- [ ] **No secrets** in public repository
- [ ] **HTTPS** active (Vercel provides this automatically)

### Clerk Security

- [ ] **MFA enabled** for all admin accounts
- [ ] **Session duration** configured (Clerk Dashboard → Sessions)
- [ ] **Production instance** active (not development)
- [ ] **Allowed domains** include only your Vercel/custom domain

### Database Security

- [ ] **Row-level security** enabled in Supabase (optional but recommended)
- [ ] **Connection pooling** active (using port 6543)
- [ ] **Database backups** enabled (automatic in Supabase)
- [ ] **SSL mode** enabled (included in connection string)

---

## 🎯 Production Readiness

### Performance

- [ ] **Image optimization** enabled (consider re-enabling in `next.config.mjs`)
- [ ] **Database indexes** added (already done in schema)
- [ ] **Redis caching** planned for scale (optional initially)

### Monitoring

- [ ] **Vercel Analytics** enabled (Dashboard → Analytics)
- [ ] **Error tracking** set up (Sentry recommended)
- [ ] **Uptime monitoring** configured (UptimeRobot, Better Uptime)

### Backup Strategy

- [ ] **Git repository** backed up (GitHub handles this)
- [ ] **Database backups** scheduled (Supabase auto-backups)
- [ ] **Environment variables** documented (in password manager)

---

## 🐛 Troubleshooting

### Build Failed: "Prisma schema not found"

**Fix:**
```bash
# Ensure prisma/schema.prisma exists in repo
git add prisma/schema.prisma
git commit -m "Add Prisma schema"
git push
```

### Build Failed: "Missing environment variable"

**Fix:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Verify all required variables are set
3. Redeploy

### "Invalid Clerk keys"

**Symptoms:** 401 errors, login fails

**Fix:**
1. Verify you're using **production** keys (`pk_live_`, `sk_live_`)
2. Check keys are correct (no extra spaces)
3. Ensure Vercel domain is added to Clerk **Domains**
4. Redeploy after fixing

### Database Connection Errors

**Symptoms:** "Can't reach database server"

**Fix:**
1. Verify `DATABASE_URL` format is correct
2. Check Supabase project is active
3. Ensure connection string includes `?pgbouncer=true` for pooling
4. Test connection from local:
   ```bash
   psql "postgresql://postgres..."
   ```

### CSP Blocking Resources

**Symptoms:** Images don't load, scripts blocked

**Fix:**
1. Open DevTools → Console
2. Note blocked URLs
3. Add domains to `next.config.mjs` CSP directives
4. Commit and push
5. Vercel auto-deploys

### Rate Limiting Not Working

**Symptoms:** Can create unlimited resources

**Fix:**
1. Verify `src/lib/ratelimit.ts` exists
2. Check Server Actions import `checkRateLimit`
3. See `RATE_LIMITING_IMPLEMENTATION.md`
4. Consider upgrading to Redis (Upstash) for production

---

## 🔄 Continuous Deployment

### Auto-Deploy on Git Push

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push

# Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
# 4. Updates your domain
```

### Preview Deployments

Every pull request gets a preview URL:
1. Create branch: `git checkout -b feature-name`
2. Make changes and push
3. Open PR on GitHub
4. Vercel comments with preview URL
5. Test changes before merging

### Rollback

If deployment breaks:
1. Vercel Dashboard → Deployments
2. Find last working deployment
3. Click **"..."** → **"Promote to Production"**
4. Instant rollback

---

## 📊 Vercel vs Render

| Feature | Vercel | Render |
|---------|--------|--------|
| **Auto-deploy** | ✅ Yes | ✅ Yes |
| **Free tier** | ✅ Generous | ✅ Limited |
| **Edge network** | ✅ Global | ⚠️ Regional |
| **Build time** | ⚡ 2-3 min | 🐢 5-10 min |
| **Custom domains** | ✅ Free SSL | ✅ Free SSL |
| **Environment vars** | ✅ Easy | ✅ Easy |
| **Database** | ❌ Separate | ✅ Integrated |
| **Docker support** | ❌ No | ✅ Yes |
| **Serverless** | ✅ Native | ⚠️ Not default |

**Recommendation:** Vercel for Next.js (optimized for it), Render if you need Docker or integrated database.

---

## 💰 Cost Estimate

### Free Tier Limits (Vercel)

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| Bandwidth | 100 GB/month | ~5 GB/month (estimated) | ✅ Safe |
| Build time | 6,000 minutes/month | ~30 min/month | ✅ Safe |
| Serverless executions | 100,000/day | ~1,000/day (estimated) | ✅ Safe |
| Edge requests | Unlimited | N/A | ✅ Safe |

**Your app should stay within free tier** for up to 100-200 users.

### When to Upgrade ($20/month Pro)

Upgrade when you hit:
- 500+ concurrent users
- 10,000+ serverless executions/day
- Need team collaboration
- Want advanced analytics

---

## 🎓 Next Steps After Deployment

### Week 1
1. [ ] Monitor error logs daily (Vercel Dashboard → Logs)
2. [ ] Test all CRUD operations in production
3. [ ] Have 2-3 test users try the app
4. [ ] Set up Sentry error tracking

### Week 2
5. [ ] Enable Vercel Analytics
6. [ ] Complete rate limiting on remaining entities
7. [ ] Add comprehensive tests (Vitest + Playwright)
8. [ ] Document any production issues

### Month 1
9. [ ] Implement missing CRUD forms (7 entities)
10. [ ] Add Redis caching (Upstash)
11. [ ] Build REST API for future mobile app
12. [ ] Add email notifications

---

## 📞 Support Resources

**Vercel:**
- Documentation: https://vercel.com/docs
- Support: support@vercel.com
- Community: https://github.com/vercel/vercel/discussions

**Clerk:**
- Documentation: https://clerk.com/docs
- Support: https://clerk.com/support
- Discord: https://clerk.com/discord

**Supabase:**
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support
- Discord: https://supabase.com/discord

**Next.js:**
- Documentation: https://nextjs.org/docs
- GitHub: https://github.com/vercel/next.js

---

## ✅ Deployment Checklist

Print this and check off as you go:

**Pre-Deployment**
- [ ] All code committed to git
- [ ] `.env` NOT in repository
- [ ] `.env.example` has placeholders only
- [ ] Critical security fixes applied
- [ ] Local testing passed

**Vercel Setup**
- [ ] Project imported from GitHub
- [ ] All environment variables added
- [ ] Production Clerk keys configured
- [ ] Database URLs configured

**Clerk Configuration**
- [ ] Vercel domain added to Clerk
- [ ] Redirect URLs configured
- [ ] Using production instance

**Deployment**
- [ ] Initial deploy successful
- [ ] Login works
- [ ] Database connected
- [ ] Images load
- [ ] No console errors

**Post-Deployment**
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Authorization tested
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring set up

---

**🎉 Congratulations!**

Your Siyakha Student Management System is now live on Vercel!

**Your production URL:**
`https://ssk-school-management-{username}.vercel.app`

**Need help?** Check the troubleshooting section above or review the engineering audit report.

---

**Last Updated:** August 16, 2026
**Guide Version:** 1.0
**Winston, System Architect**
