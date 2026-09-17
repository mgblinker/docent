---
type: architecture
audience: public
---

# Processity Drive

## What it is

Processity Drive is secure file storage and sharing, built into the
Processity platform. It works like other cloud drives you may already
know: store files and folders, share them with colleagues, edit Office
documents in the browser, and keep a local folder on your computer in
sync automatically.

## Components

Drive has three parts that work together:

- **Drive web app** — browse, upload, share, and edit files directly in
  your browser, from any device.
- **Desktop Sync Client** ("Processity Drive" app for Windows and macOS) —
  keeps a folder on your computer automatically in sync with your files
  in Drive, the same way OneDrive or Google Drive desktop apps do.
- **Storage service** — the backend that stores and organizes every file
  and folder, and connects files to the records they belong to elsewhere
  in Processity (e.g. a document attached to a Planning task or an
  ImmoBroker listing).

## How they interact

The web app and the desktop Sync Client both talk to the same storage
service, through the same secure, already-logged-in Processity session —
there's no separate Drive account or password to manage. Changes made in
one place (uploading a file in the browser, editing it locally on your
computer) show up in the other automatically.

Office documents can also be opened and edited directly in the browser
without downloading them first.

## Where your data lives

File contents are stored in an object storage service hosted in
Switzerland (Infomaniak's Swiss cloud infrastructure), separate from the
database that holds file and folder names, permissions, and sharing
settings. Your data is backed up as part of Processity's standard
operating procedures.

## Licensing & access

Drive is a separate add-on to your Processity subscription. A tenant
administrator assigns Drive access to individual users, the same way
other Processity add-ons are assigned — a user without an assigned Drive
license doesn't get standalone Drive access, though files attached to
records in other Processity apps (e.g. an attachment on a Planning task)
still work normally for every user regardless of the Drive add-on.
