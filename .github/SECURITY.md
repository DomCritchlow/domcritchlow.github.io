# Security

## Overview

This document outlines the security measures implemented in this repository to protect against common vulnerabilities.

## Photo Upload Security

### 1. Webhook Secret Authentication

**Protection**: Prevents unauthorized users from uploading images to your gallery

**Implementation**:
- Webhook secret stored in GitHub Secrets (`WEBHOOK_SECRET`)
- Secret must be included in every upload request
- Verified using constant-time comparison to prevent timing attacks
- Action fails immediately if secret is missing or invalid

**Setup**: See `.github/PHOTO_UPLOAD_SETUP.md` for configuration instructions

### 2. Filename Sanitization

**Protection**: Prevents path traversal attacks (e.g., `../../etc/passwd`)

**Implementation**:
- All special characters except alphanumerics, dots, underscores, and hyphens are replaced with underscores
- `path.basename()` ensures only the filename is used (no directory components)
- File extension validation (only `.jpg`, `.jpeg`, `.png`, `.webp` allowed)
- Invalid extensions are automatically corrected to `.jpg`

**Code**: `.github/scripts/process-photo.js` - `sanitizeFilename()` function

### 3. Image Validation

**Protection**: Ensures only valid images are processed, prevents upload of malicious files

**Implementation**:
- **Size limit**: Maximum 10MB per image
- **Format validation**: Only JPEG, PNG, and WebP formats accepted
- **Metadata verification**: Uses `sharp` library to validate image structure
- Rejects files that don't match valid image signatures

**Code**: `.github/scripts/process-photo.js` - validation checks

## Token Management

### GitHub Personal Access Token

**Purpose**: Allows iOS Shortcut to trigger GitHub Actions via repository_dispatch

**Scope**: Requires `repo` (full repository access)

**Security Considerations**:
- Token is stored in plain text in iOS Shortcut (inherent limitation)
- Should be rotated regularly
- Only grant to trusted devices
- Can be revoked at any time from GitHub settings

**Recommendations**:
1. Use a dedicated token just for photo uploads
2. Consider using GitHub App for better security isolation
3. Monitor repository activity for suspicious commits
4. Enable 2FA on your GitHub account

### Webhook Secret

**Purpose**: Authenticates upload requests to prevent abuse

**Storage**: 
- Stored in GitHub repository secrets (encrypted at rest)
- Never committed to code
- Provided to iOS Shortcut (stored in plain text locally)

**Best Practices**:
1. Generate using cryptographically secure random generator
2. Minimum 32 characters (use `openssl rand -hex 32`)
3. Keep secret secure on your iOS device
4. Rotate if compromised

## Threat Model

### Protected Against

✅ **Unauthorized Uploads**: Webhook secret prevents strangers from uploading to your gallery
✅ **Path Traversal**: Filename sanitization prevents file system attacks
✅ **Malicious Files**: Image validation rejects non-image files
✅ **Resource Exhaustion**: Size limits prevent oversized uploads
✅ **Timing Attacks**: Constant-time secret comparison

### Known Limitations

⚠️ **Token Exposure**: GitHub token stored in iOS Shortcut is accessible if device is compromised
⚠️ **Secret Exposure**: Webhook secret stored in iOS Shortcut is accessible if device is compromised
⚠️ **Device Security**: Relies on iOS device security (passcode, biometrics, etc.)
⚠️ **Public Repository**: If repository is public, workflow code is visible (but secrets are not)

### Mitigations for Limitations

1. **Use strong device security**: 
   - Enable Face ID / Touch ID
   - Use strong passcode
   - Enable "Erase Data" after failed attempts

2. **Monitor activity**:
   - Check GitHub Actions logs regularly
   - Review commits to gallery folders
   - Watch for unexpected images

3. **Quick response**:
   - Know how to revoke GitHub token immediately
   - Know how to rotate webhook secret
   - Can disable GitHub Action workflow if needed

4. **Consider alternatives**:
   - For high-security needs, use manual upload instead
   - Consider self-hosted solution with proper authentication
   - Use GitHub App instead of personal access token

## Reporting Security Issues

If you discover a security vulnerability in this setup:

1. **Do NOT** open a public issue
2. Email the repository owner directly
3. Include details of the vulnerability and potential impact
4. Allow reasonable time for a fix before public disclosure

## Security Checklist

Before using the photo upload feature:

- [ ] Generated strong webhook secret (32+ characters)
- [ ] Added webhook secret to GitHub repository secrets
- [ ] Created GitHub personal access token with only `repo` scope
- [ ] Secured iOS device with Face ID/Touch ID and strong passcode
- [ ] Verified `.env` files are in `.gitignore`
- [ ] Reviewed GitHub Actions permissions (Read and write only)
- [ ] Tested upload with a sample image
- [ ] Confirmed validation rejects non-image files
- [ ] Confirmed validation rejects oversized files (>10MB)

## Updates

This document will be updated as new security measures are implemented or vulnerabilities are discovered.

Last updated: 2025-01-30

