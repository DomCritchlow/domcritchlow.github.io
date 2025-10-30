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

#### Quick Steps:

1. Open the **Shortcuts** app on your iPhone (built into iOS)
2. Tap the **"+"** button (top right) to create a new shortcut
3. Follow the detailed steps below to add each action

#### Detailed Step-by-Step:

**Step 1: Receive Input**
1. Search for "Receive" → select **"Receive [Something] input from"**
2. Tap "Something" → change to **"Images"**
3. Tap "Nowhere" → change to **"Share Sheet"**

**Step 2: Get Name**
1. Search for "Get Name" → select **"Get Name"**
2. Tap the input → select **"Shortcut Input"**

**Step 3: Set Variable (for filename)**
1. Search for "Set Variable" → select **"Set variable"**
2. Name it: **"filename"**
3. Tap the value field → select **"Name"** from previous action

**Step 4: Text (build filename)**
1. Search for "Text" → select **"Text"**
2. Build the text: `[filename]-[Current Date].jpg`
   - Long press to insert variables
   - For Current Date: tap variables → Current Date → Format: Custom → `yyyyMMdd-HHmmss`

**Step 5: Set Variable (for ImageName)**
1. Add another "Set variable"
2. Name it: **"ImageName"**
3. Value: **Text** from previous action

**Step 6: Encode to Base64**
1. Search for "Encode" → select **"Encode [Something]"**
2. Change input to **"Shortcut Input"**
3. Encoding: **Base64**

**Step 7: Get Contents of URL**
1. Search for "Get Contents of URL" → select it
2. Configure:
   - **URL**: `https://api.github.com/repos/DomCritchlow/domcritchlow.github.io/dispatches`
   - Tap "Show More" ▼
   - **Method**: POST
   - **Headers**: Add 3 headers:
     - `Authorization`: `Bearer YOUR_TOKEN_HERE` (replace with your actual GitHub token)
     - `Accept`: `application/vnd.github.v3+json`
     - `Content-Type`: `application/json`
   - **Request Body**: JSON
   - In the JSON body field, enter:
```json
{
  "event_type": "add-photo",
  "client_payload": {
    "image_data": "PUT_BASE64_HERE",
    "image_name": "PUT_IMAGENAME_HERE"
  }
}
```
   - Replace `PUT_BASE64_HERE` by long-pressing and selecting variable **Base64 Encoded**
   - Replace `PUT_IMAGENAME_HERE` by long-pressing and selecting variable **ImageName**

**Step 8: Show Notification**
1. Search for "Show Notification" → select it
2. Text: **"Photo uploaded to gallery!"**

**Step 9: Configure Shortcut Settings**
1. Tap the settings icon (⚙️) at top right
2. Name it: **"Add to Gallery"**
3. Enable **"Show in Share Sheet"**
4. Under "Share Sheet Types" → enable **"Images"**
5. Choose an icon/color if desired
6. Tap "Done"

#### Legacy Reference (actions list):

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

