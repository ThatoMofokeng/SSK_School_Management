# ⚡ Quick Deploy Checklist - Vercel

**30-minute deployment guide for SSK School Management**

---

## 🎯 Before You Start

✅ GitHub repository ready
✅ Supabase database active
✅ Clerk account created
✅ 30 minutes available

---

## Step 1: Prepare (5 min)

### Get Your Credentials Ready

**Clerk Production Keys:**
1. https://dashboard.clerk.com → Switch to "Production"
2. API Keys → Copy both:
   - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live_...)
   - [ ] `CLERK_SECRET_KEY` (sk_live_...)

**Database URLs:**
1. https://supabase.com/dashboard → Your Project
2. Settings → Database → Connection String
3. Copy both:
   - [ ] Connection Pooling (port 6543) → `DATABASE_URL`
   - [ ] Direct Connection (port 5432) → `DIRECT_URL`

---

## Step 2: Push to GitHub (5 min)

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit
git commit -m "feat: security fixes and deployment prep"

# 4. Push to GitHub
git push -u origin main
```

**⚠️ VERIFY:** `.env` is NOT in the commit
```bash
git status | grep .env
# Should only show .env.example (if anything)
```

---

## Step 3: Deploy to Vercel (10 min)

### Import Project

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select **SSK_School_Management**
4. Click **"Import"**

### Add Environment Variables

Click **"Environment Variables"** and add these 7 variables:

| Variable | Get From | Example |
|----------|----------|---------|
| `DATABASE_URL` | Supabase (pooling, port 6543) | `postgresql://...6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase (direct, port 5432) | `postgresql://...5432/postgres` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (pk_live_...) | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk (sk_live_...) | `sk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Type manually | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Type manually | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Type manually | `/` |

**For each variable:**
- [ ] Select all 3 environments (Production, Preview, Development)
- [ ] Click "Add"

### Deploy

1. Click **"Deploy"**
2. ☕ Wait 2-3 minutes
3. Build should succeed (green checkmark)

**Your app is now at:** `https://ssk-school-management-{username}.vercel.app`

---

## Step 4: Configure Clerk (5 min)

### Add Vercel Domain

1. https://dashboard.clerk.com
2. Ensure "Production" environment selected
3. Go to **Domains**
4. Click **"Add domain"**
5. Enter: `ssk-school-management-{username}.vercel.app`
6. Save

### Update Paths

1. Still in Clerk Dashboard
2. Go to **Paths**
3. Set these values:
   - Sign-in URL: `/sign-in`
   - After sign-in: `/`
4. Save

---

## Step 5: Verify (5 min)

### Test Critical Functions

1. **Visit your app:**
   ```
   https://ssk-school-management-{username}.vercel.app
   ```
   - [ ] Page loads (redirects to /sign-in)

2. **Test login:**
   - [ ] Enter credentials
   - [ ] Successfully logs in
   - [ ] Redirects to dashboard

3. **Test database:**
   - [ ] Go to /list/students
   - [ ] List loads (empty is OK)
   - [ ] No errors in console

4. **Test security:**
   ```bash
   curl -I https://your-app.vercel.app | grep "X-Frame-Options"
   ```
   - [ ] Shows: `X-Frame-Options: SAMEORIGIN`

5. **Test rate limiting:**
   - [ ] Try creating 6 subjects rapidly
   - [ ] 6th request fails with rate limit error

---

## ✅ Success Checklist

- [ ] App loads at Vercel URL
- [ ] Login works
- [ ] Dashboard displays
- [ ] Database connected
- [ ] Security headers active
- [ ] No console errors
- [ ] Rate limiting works

---

## 🚨 Quick Fixes

### "Invalid Clerk keys"
→ Check you're using `pk_live_*` not `pk_test_*`
→ Verify domain added to Clerk

### "Database connection failed"
→ Check `DATABASE_URL` has `?pgbouncer=true`
→ Verify Supabase project is active

### "Build failed"
→ Check Vercel build logs for specific error
→ Verify all env vars are set
→ Try redeploying

### "CSP blocking resources"
→ Open DevTools → Console
→ Check for CSP violation errors
→ Add blocked domain to `next.config.mjs`

---

## 🎉 You're Live!

**Next Steps:**

1. **Monitor for 24 hours:**
   - Vercel Dashboard → Logs
   - Watch for errors

2. **Test with real users:**
   - Have 2-3 people try it
   - Note any issues

3. **Set up monitoring:**
   - Enable Vercel Analytics
   - Add Sentry for errors

**Need detailed help?** See `VERCEL_DEPLOYMENT_GUIDE.md`

---

**Deployed:** [Date]
**URL:** https://ssk-school-management-{username}.vercel.app
**Status:** 🟢 Live
