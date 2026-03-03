# Chrome Web Store Deployment Guide

This guide covers the full process of building and publishing the Miva LMS Study Helper to the Chrome Web Store, from a clean local build through to a live listing.

---

## Prerequisites

- Node.js 18+ installed
- A Google account (personal or Google Workspace)
- A one-time $5 USD Chrome Web Store developer registration fee
- All screenshots prepared (see [STORE_LISTING.md](./STORE_LISTING.md))

---

## Step 1 — Register as a Chrome Web Store Developer

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the one-time $5 USD developer registration fee
4. Accept the developer agreement

This registration is permanent — you only pay once.

---

## Step 2 — Build the Production Package

Plasmo handles the entire build and zip process. From the project root:

```bash
# Install dependencies if you haven't already
npm install

# Create a production build and zip file ready for upload
npm run package
```

This runs `plasmo package` internally, which:
- Compiles TypeScript and bundles all assets
- Writes the build output to `build/chrome-mv3-prod/`
- Creates a zip at `build/chrome-mv3-prod.zip` — this is the file you upload

> **Before packaging**, bump the `version` field in `package.json` if this is an update. Plasmo reads it and injects it into the manifest automatically.

---

## Step 3 — Verify the Build Locally

Before uploading, load the unpacked build in Chrome and confirm everything works:

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select `build/chrome-mv3-prod/`
4. Navigate to `https://lms.miva.university/my/courses.php` and verify:
   - Study list section appears on the My Courses page
   - Bookmark buttons render correctly on course cards
   - The popup shows study list and progress data
   - Progress tracking works on a course page (`course/view.php`)
   - Activity completion indicators appear on activity pages (`mod/*/view.php`)

---

## Step 4 — Create a New Item in the Developer Dashboard

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Click **New item**
3. Upload `build/chrome-mv3-prod.zip`
4. The dashboard will extract and validate the manifest automatically

---

## Step 5 — Fill In Store Listing Details

Use the content in [STORE_LISTING.md](./STORE_LISTING.md) for the fields below.

### Store Listing tab

| Field | Value |
|---|---|
| Extension name | Miva LMS Study Helper |
| Short description | Track your learning progress on Miva University's LMS with visual indicators and study list management. |
| Detailed description | Copy from `STORE_LISTING.md` |
| Category | Productivity |
| Language | English |
| Primary color | `#1a237e` (matches the extension's dark blue theme) |

### Graphics

Upload the screenshots described in `STORE_LISTING.md`. Chrome Web Store requirements:
- **Screenshots:** 1–5 images, 1280×800 or 640×400 px, PNG or JPEG
- **Promotional tile (small):** 440×280 px PNG — required for the listing to go live
- **Extension icon:** 128×128 px PNG — already present at `assets/icon.png`

### Privacy tab

| Field | Value |
|---|---|
| Single purpose | Tracks course progress and manages study lists on Miva University's LMS |
| Permission justification | Copy from the table in `STORE_LISTING.md` |
| Data usage | Select **"This extension does not collect or use any user data"** — all storage is local via `chrome.storage.local` and `chrome.storage.sync` (Google account only) |
| Privacy policy URL | `https://ladaposamuel.github.io/mivalmshelper/privacy-policy.html` — see Step 6 |

---

## Step 6 — Host the Privacy Policy

A publicly accessible privacy policy URL is mandatory. The file already exists at `docs/privacy-policy.html`.

**Option A — GitHub Pages (recommended, free)**

1. Push the repo to GitHub if you haven't already:
   ```bash
   git remote add origin https://github.com/ladaposamuel/mivalmshelper.git
   git push -u origin main
   ```
2. Go to the repo **Settings → Pages**
3. Set Source to **Deploy from a branch**, branch: `main`, folder: `/ (root)`
4. Your privacy policy will be live at:
   `https://ladaposamuel.github.io/mivalmshelper/privacy-policy.html`

**Option B — Any static host**  
Upload `docs/privacy-policy.html` to any publicly accessible URL (Netlify, Vercel, your own domain, etc.).

---

## Step 7 — Submit for Review

1. In the Developer Dashboard, click **Save draft** first and review all fields
2. When ready, click **Submit for review**
3. Google's review typically takes **1–3 business days** for a new extension

You will receive an email when the review is complete. If rejected, the email will include the specific policy violation — fix it and resubmit.

---

## Publishing Updates

When you make changes to the extension:

1. Increment the version in `package.json`:
   ```json
   "version": "1.0.1"
   ```
2. Rebuild and repackage:
   ```bash
   npm run package
   ```
3. In the Developer Dashboard, click your extension → **Package** tab → **Upload new package**
4. Upload the new `build/chrome-mv3-prod.zip`
5. Update the store listing description if the changes are user-facing
6. Click **Submit for review**

Updates to existing extensions generally review faster than new submissions (often same day).

---

## Common Review Rejection Reasons

| Reason | Fix |
|---|---|
| Missing or inaccessible privacy policy URL | Ensure the URL resolves publicly before submitting |
| Overly broad permissions | The `host_permissions` are already scoped to `lms.miva.university/*` — no action needed |
| Missing permission justification | The `storage`, `activeTab`, and `tabs` justifications are in `STORE_LISTING.md` |
| Screenshots do not match functionality | Retake screenshots after the final build |
| Promotional tile missing | Upload the 440×280 small promotional tile — it is required |

---

## Useful Links

- Chrome Web Store Developer Dashboard: [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
- Chrome Web Store Developer Policies: [https://developer.chrome.com/docs/webstore/program-policies/](https://developer.chrome.com/docs/webstore/program-policies/)
- Plasmo `package` command docs: [https://docs.plasmo.com/framework/workflows/submit](https://docs.plasmo.com/framework/workflows/submit)
- MV3 permission best practices: [https://developer.chrome.com/docs/extensions/mv3/declare_permissions/](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
