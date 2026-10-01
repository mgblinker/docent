---
type: manual
audience: public
---

# Processity Drive — Getting Started & Sync Client Setup

Welcome to Processity Drive! This guide walks you through activating
your account, using Drive in your browser, and setting up the desktop
Sync Client so a folder on your computer stays automatically in sync.

---

## Getting started

### 1. Receive your invitation

Your administrator adds you as a contact in Processity. You'll receive
an invitation email with a **Set your password** link.

![Invitation email with a "Set your password" link](media/invitation-email.png)

### 2. Set your password

Click **Set your password** in the email. On the screen that opens,
choose a password that meets these requirements:

- At least 10 characters
- Upper and lower case letters, a number, and a symbol
- No sequential number series (e.g. `1234`) and no character repeated 3
  or more times in a row

Click **Set password** to finish setting up your account.

![Set password screen with password and confirmation fields](media/set-password.png)

### 3. Sign in to Drive in your browser

Go to **[drive.processity.ch](https://drive.processity.ch/)** and sign
in with your new password. You can browse and use your shared folders
directly here — no extra setup needed.

---

## Signing in

You have two ways to sign in to Drive and the Sync Client:

- **Password** — the password you set up in step 2, optionally followed
  by a two-factor code if your administrator requires it.
- **Passkey** — if your administrator has enabled passkeys, you can sign
  in with your device's built-in authentication (Windows Hello, Touch
  ID, a security key) instead of typing a password. Passkeys are
  phishing-resistant: they only work on the real Processity sign-in
  page, never a look-alike.

The desktop Sync Client never asks for or stores your password directly.
Instead, signing in **links** that specific computer to your account: a
private key is generated on your computer and never leaves it, and only
the matching public key is registered with Processity. A stolen or lost
laptop can't be used to sign in elsewhere with it, and you can unlink a
device at any time without touching your Processity password.

When you click **Sign in** in the Sync Client, it opens your system
browser to a Processity sign-in page addressed specifically to that
app on that computer. Only open this page if you started it yourself,
from the Sync Client on your own computer — if a sign-in page like this
reaches you any other way (e.g. a link in an email or chat message),
don't sign in through it, and let your administrator know.

### Managing your linked devices

You can see every device linked to your account, and unlink one you no
longer use or don't recognize, from **Personalization → Devices** in the
Processity web app.

---

## Setting up the desktop Sync Client

If you'd like a local folder on your computer that stays automatically
in sync with Drive, install the desktop Sync Client — it works the same
way as the OneDrive or Google Drive desktop apps.

### 4. Download the client

Click the **Download client** icon in Drive's toolbar.

![Download client icon in the Drive toolbar](media/download-client-icon.png)

The download page automatically detects whether you're on Windows or
macOS and offers the matching installer.

![Download page showing the detected platform and installer](media/download-page.png)

### 5. Install and add your account

Open the installed app and go to **Settings** (gear icon). On the
**Accounts** tab, click **+** to add a new account, then sign in with
the same details you used to set up your Processity account.

![Processity Drive app with the settings icon highlighted](media/app-settings.png)

### 6. Start syncing

Back in the Processity Drive app, click **Sync now**. Your account is
now connected — a local sync folder is created on your computer, and
your shared files start syncing into it automatically.

![Processity Drive app showing a synced, up-to-date folder](media/app-synced.png)

---

## If you're already signed in (October 2026 security update)

We tightened how the Sync Client links devices and renews your sign-in
in the background. If you're already signed in and syncing, **nothing
changes for you** — your computer stays connected and keeps syncing as
before. You only need to act if one of these applies:

- **You're setting up the Sync Client on a new computer, or signing in
  again after being signed out** (including after a password reset) —
  make sure you have the latest version first — the app checks and
  updates itself automatically, or you can trigger a check from its
  tray icon (**Check for updates**), or download it again from Drive's
  toolbar. An older version can't complete sign-in or device-linking
  against the updated service.
- **You just reset your password** using the emailed reset link —
  this now also signs every linked device out, as a precaution, since a
  password reset is how you'd recover an account you think was
  compromised. Sign in again on each computer afterwards, with the
  latest Sync Client version.
- **A sign-in link reached you unexpectedly** (not opened by you
  clicking "Sign in" in the Sync Client itself) — don't use it. See
  [Signing in](#signing-in) above.

This applies the same way whether you normally sign in with a password
or a passkey — both end up linking your device the same way under the
hood.

---

## Related

- [Processity Drive — overview](./architecture.md) — what Drive is, its
  components, security, and licensing
