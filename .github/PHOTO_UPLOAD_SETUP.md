# Photo Upload Setup

This setup allows you to upload photos to your gallery directly from your iPhone's share sheet.

## How It Works

1. Share an image from any app on your iPhone
2. Select the custom shortcut
3. Image is uploaded to GitHub
4. GitHub Action processes it (creates thumbnail)
5. Site automatically rebuilds with new photo

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Photo Upload Token"
4. Select scopes:
   - ✓ `repo` (full control of private repositories)
5. Generate and **copy the token** (you won't see it again!)

### 2. Create iOS Shortcut

1. Open Shortcuts app on iPhone
2. Create new shortcut with these actions:

```
1. Receive [Images] input from Share Sheet

2. Get Name of [Shortcut Input]
   → Save to variable: FileName

3. Set variable ImageName to:
   [FileName]-[Current Date formatted as yyyyMMdd-HHmmss].jpg

4. Encode [Shortcut Input] with Base64

5. Get Contents of URL:
   URL: https://api.github.com/repos/YOUR_USERNAME/domcritchlow.github.io/dispatches
   Method: POST
   Headers:
     Authorization: Bearer YOUR_GITHUB_TOKEN
     Accept: application/vnd.github.v3+json
     Content-Type: application/json
   Request Body: JSON
   {
     "event_type": "add-photo",
     "client_payload": {
       "image_data": "[Base64 Encoded]",
       "image_name": "[ImageName]"
     }
   }

6. Show notification: "Photo uploaded successfully!"
```

### Shortcut Configuration Details

**Action 1: Receive Input**
- Type: Images
- Source: Share Sheet

**Action 2: Get Name**
- Get name of: Shortcut Input
- Save to variable: `FileName`

**Action 3: Set Variable**
- Set: `ImageName`
- To: Text with variables
  - `FileName` (without extension)
  - `-`
  - Current Date (formatted as `yyyyMMdd-HHmmss`)
  - `.jpg`

**Action 4: Encode**
- Encode: Shortcut Input
- Encoding: Base64

**Action 5: Get Contents of URL**
- URL: `https://api.github.com/repos/DomCritchlow/domcritchlow.github.io/dispatches`
- Method: POST
- Headers:
  - `Authorization`: `Bearer ghp_yourTokenHere`
  - `Accept`: `application/vnd.github.v3+json`
  - `Content-Type`: `application/json`
- Request Body: JSON
```json
{
  "event_type": "add-photo",
  "client_payload": {
    "image_data": "{{Base64EncodedResult}}",
    "image_name": "{{ImageName}}"
  }
}
```

**Action 6: Show Notification**
- Text: "Photo uploaded successfully!"

### 3. Repository Settings

Make sure GitHub Actions are enabled:
1. Go to repository Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Under "Workflow permissions", select:
   - ✓ Read and write permissions
   - ✓ Allow GitHub Actions to create and approve pull requests

## Testing

1. Find any image on your iPhone
2. Tap Share → Your Shortcut Name
3. Wait for notification
4. Check GitHub Actions tab to see workflow running
5. Once complete, your site will rebuild with the new photo

## Troubleshooting

**Workflow doesn't trigger:**
- Check your GitHub token is valid and has `repo` scope
- Verify the repository name in the URL is correct

**Workflow fails:**
- Check GitHub Actions logs for errors
- Make sure `sharp` can be installed (should work on Ubuntu)
- Verify image data is being passed correctly

**Image doesn't appear:**
- Make sure the commit was pushed successfully
- Check that your site hosting automatically rebuilds on push
- Verify the image files are in the correct folders

## File Locations

- Original images: `public/gallery/`
- Thumbnails: `public/gallery-thumbs/`
- Photos are auto-detected by `src/_data/photos.js`

