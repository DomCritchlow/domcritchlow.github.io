# GitHub Actions & Automation

## Photo Upload from iPhone

### What's Been Set Up

✅ **GitHub Action Workflow** (`.github/workflows/add-photo.yml`)
- Triggered by repository dispatch events
- Processes images and creates thumbnails
- Auto-commits to repository

✅ **Image Processing Script** (`.github/scripts/process-photo.js`)
- Accepts base64 encoded images
- Creates 300px thumbnails
- Saves to correct folders

✅ **Package Dependencies** (`package.json`)
- Added `sharp` for image processing

### What You Need to Do

1. **Create Webhook Secret**
   - Generate a secure random string: `openssl rand -hex 32`
   - Go to repo Settings → Secrets and variables → Actions
   - Add new secret named `WEBHOOK_SECRET`
   - Save this secret for use in iOS Shortcut

2. **Create GitHub Token**
   - Go to: https://github.com/settings/tokens
   - Generate new token (classic)
   - Select `repo` scope
   - Copy the token

3. **Set up iOS Shortcut**
   - See detailed instructions in `PHOTO_UPLOAD_SETUP.md`
   - Replace `YOUR_WEBHOOK_SECRET_HERE` with your webhook secret
   - Replace `YOUR_GITHUB_TOKEN_HERE` with your token
   - Configure shortcut to appear in share sheet

4. **Enable GitHub Actions**
   - Go to repo Settings → Actions → General
   - Enable "Allow all actions"
   - Set workflow permissions to "Read and write"

5. **Test It!**
   - Share any image from iPhone
   - Run your shortcut
   - Watch GitHub Actions process it
   - See it appear in your gallery

### Files Created

```
.github/
├── workflows/
│   └── add-photo.yml          # GitHub Action workflow
├── scripts/
│   └── process-photo.js        # Image processing script
├── PHOTO_UPLOAD_SETUP.md       # Detailed setup guide
├── ios-shortcut-template.json  # Shortcut template
└── README.md                   # This file
```

### How It Works

```
iPhone Share Sheet
       ↓
iOS Shortcut (encodes image to base64)
       ↓
GitHub API (repository_dispatch)
       ↓
GitHub Action Triggered
       ↓
Process image + create thumbnail
       ↓
Commit to repository
       ↓
Site rebuilds automatically
       ↓
Photo appears in gallery!
```

### Security Features

✅ **Webhook Secret Authentication**
- Prevents unauthorized uploads
- Secret stored in GitHub Secrets (never in code)
- Validated before processing any image

✅ **Filename Sanitization**
- Prevents path traversal attacks
- Removes dangerous characters
- Ensures safe file paths

✅ **Image Validation**
- Verifies actual image format (JPEG, PNG, WebP only)
- Size limit: 10MB maximum
- Uses `sharp` to validate image metadata
- Rejects non-image files

### Troubleshooting

- **Action doesn't trigger**: Check token has `repo` scope and webhook secret matches
- **Action fails with "Invalid webhook secret"**: Verify WEBHOOK_SECRET is set in repo secrets
- **Action fails**: Check logs in Actions tab
- **Image doesn't appear**: Verify commit was pushed and site rebuilt

### Future Enhancements

Possible improvements:
- Add image compression options
- Support custom filenames
- Add photo metadata/captions
- Batch upload multiple photos
- Email notification when photo is live

