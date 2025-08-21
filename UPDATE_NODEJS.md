# Node.js Update Guide

## Current Issue
The SvelteKit project requires Node.js 20.19+ but you have 20.11.1.

## Solution Steps

### 1. Update Node.js to Latest LTS
Download from: https://nodejs.org/
- Choose "LTS" version (recommended)
- Install and restart your terminal

### 2. Verify Update
After installation, run:
```bash
node --version  # Should show 22.x.x or 20.19+
npm --version   # Should show 10.x+
```

### 3. Test the Project
```bash
cd farmtrack-sveltekit
npm run dev
```

### 4. If Issues Persist
Clear npm cache and reinstall:
```bash
cd farmtrack-sveltekit
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Expected Result
- Development server starts on http://localhost:5173
- No engine compatibility warnings
- Project loads successfully in browser

## Backup Plan
If you prefer to keep your current Node.js version, we can downgrade the SvelteKit dependencies to compatible versions, but updating Node.js is recommended for the best experience.