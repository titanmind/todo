# Setup

## 1. Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. **Enable the Google Drive API:**
   - APIs & Services → Library → search "Google Drive API" → Enable

## 2. OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. Choose **External** user type
3. Fill in app name ("Todo") and your email for support/developer contact
4. Scopes: add `https://www.googleapis.com/auth/drive.file`
5. Test users: add your Google account email
6. Save (you can leave it in Testing mode — only your listed test users can auth)

## 3. OAuth Client ID

1. APIs & Services → Credentials → Create Credentials → **OAuth client ID**
2. Application type: **Web application**
3. Authorized JavaScript origins: add every origin you'll serve from, e.g.:
   - `https://yourusername.github.io` (GitHub Pages)
   - `http://localhost:8000` (local dev)
4. Copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
5. Paste it into `todo-prototype.html` replacing `YOUR_CLIENT_ID_HERE`

## 4. Serve over HTTPS (or localhost)

OAuth requires HTTPS or `localhost`. For local testing:

```
# Python
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000/todo-prototype.html`.

For production, push to GitHub Pages or any static host with HTTPS.

## 5. First Launch

1. Open the app → click "Sign in with Google"
2. Choose your Google account → grant Drive file access
3. The app creates `todo-data.json` on your Drive automatically
4. You're done — all data syncs to that file from now on
