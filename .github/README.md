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

1. **Create GitHub Token**
   - Go to: https://github.com/settings/tokens
   - Generate new token (classic)
   - Select `repo` scope
   - Copy the token

2. **Set up iOS Shortcut**
   - See detailed instructions in `PHOTO_UPLOAD_SETUP.md`
   - Replace `YOUR_GITHUB_TOKEN_HERE` with your token
   - Configure shortcut to appear in share sheet

3. **Enable GitHub Actions**
   - Go to repo Settings → Actions → General
   - Enable "Allow all actions"
   - Set workflow permissions to "Read and write"

4. **Test It!**
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

### Troubleshooting

- **Action doesn't trigger**: Check token has `repo` scope
- **Action fails**: Check logs in Actions tab
- **Image doesn't appear**: Verify commit was pushed and site rebuilt

### Future Enhancements

Possible improvements:
- Add image compression options
- Support custom filenames
- Add photo metadata/captions
- Batch upload multiple photos
- Email notification when photo is live

