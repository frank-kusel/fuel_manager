# FarmTrack Deployment Guide

## 🚀 Deploying to Netlify

### Prerequisites
- A Netlify account (free tier works)
- GitHub repository with the code
- Supabase project (for the database)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Configure Netlify

1. **Connect Repository**
   - Log in to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account and select your repository

2. **Build Settings** (Auto-detected from netlify.toml)
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 18

3. **Environment Variables**
   Add these in Netlify Dashboard → Site Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Step 3: Deploy
- Click "Deploy site"
- Wait for the build to complete (2-3 minutes)
- Your site will be live at `https://your-site-name.netlify.app`

### Step 4: Custom Domain (Optional)
- Go to Domain Settings
- Add your custom domain
- Follow DNS configuration instructions

## 🔐 Security Checklist

✅ **Environment Variables**
- Never commit `.env` files
- All secrets stored in Netlify environment variables
- `.gitignore` properly configured

✅ **Supabase Security**
- Row Level Security (RLS) enabled on all tables
- Proper authentication policies in place
- API keys are public (anon) keys only

✅ **Build Security**
- Dependencies regularly updated
- Security headers configured in `netlify.toml`
- HTTPS enforced automatically by Netlify

## 📊 Database Setup

Before deploying, ensure your Supabase database has:

1. **Required Tables** (created via migrations)
   - vehicles
   - drivers
   - activities
   - fields
   - zones
   - bowsers
   - fuel_entries

2. **SQL Functions** (for analytics)
   Run the migration files in `database/migrations/` folder:
   - `009_analytics_functions.sql`

3. **Row Level Security**
   Enable RLS on all tables for production

## 🔧 Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### App Doesn't Load
- Verify environment variables are set in Netlify
- Check browser console for errors
- Ensure Supabase project is active

### Database Connection Issues
- Verify Supabase URL and keys
- Check Supabase project status
- Ensure RLS policies allow access

## 📱 Post-Deployment

1. **Test all features**
   - Fuel entry workflow
   - Dashboard loading
   - Analytics pages
   - Data persistence

2. **Monitor**
   - Set up Netlify Analytics
   - Monitor Supabase usage
   - Check error logs regularly

3. **Updates**
   - Push changes to GitHub
   - Netlify auto-deploys on push to main
   - Test in preview deployments first

## 🆘 Support

For issues:
- Check Netlify build logs
- Review browser console errors
- Verify Supabase connection
- Check GitHub issues for known problems