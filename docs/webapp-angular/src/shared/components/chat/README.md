---
type: feature
---

# Chat Components

This folder contains the base chat components that can be used across different applications with varying display modes.

## Architecture

The chat functionality is built using a layered approach:

1. **Base Layer**: `ChatBaseComponent`

   - Contains all core chat functionality
   - Manages messages, typing, and user interactions
   - Supports different display modes
   - Located in `/shared/components/chat-base/`

2. **Specialized Wrappers**:
   - **Mobile Chat**: Overlay mode for mobile apps (`/mobile-shared/components/chat/`)
   - **Web Chat**: Popup window mode for web applications (`/social-care/web-app/components/web-chat/`)
   - **Embedded Chat**: In-page mode for embedding in layouts (`/shared/components/embedded-chat/`)

## Display Modes

The chat supports three different display modes:

- **OVERLAY**: Full-screen overlay with background for mobile devices
- **WINDOW**: Floating window for web applications
- **EMBEDDED**: Embedded within page layouts

## Usage

### Mobile Chat (Overlay)

```typescript
import { ChatComponent } from 'path/to/mobile-shared/components/chat/chat.component';

@Component({
  imports: [ChatComponent],
  template: `
    <mobile-shared-chat
      [title]="'Support Chat'"
      [messages]="messages"
      (messageSent)="onMessageSent($event)"
      (closed)="onChatClosed()">
    </mobile-shared-chat>
  `
})
```

### Web Chat (Window)

```typescript
import { WebChatComponent } from 'path/to/social-care/web-app/components/web-chat/web-chat.component';

@Component({
  imports: [WebChatComponent],
  template: `
    <app-web-chat
      [title]="'Help Center'"
      [messages]="messages"
      (messageSent)="onMessageSent($event)"
      (closed)="onChatClosed()">
    </app-web-chat>
  `
})
```

### Embedded Chat

```typescript
import { EmbeddedChatComponent } from 'path/to/shared/components/embedded-chat/embedded-chat.component';

@Component({
  imports: [EmbeddedChatComponent],
  template: `
    <app-embedded-chat
      [title]="'Community Chat'"
      [messages]="messages"
      (messageSent)="onMessageSent($event)">
    </app-embedded-chat>
  `
})
```

### Direct Base Component Usage

You can also use the base component directly with a specific display mode:

```typescript
import { ChatBaseComponent } from 'path/to/shared/components/chat-base/chat-base.component';
import { ChatDisplayMode } from 'path/to/shared/components/chat-base/chat-base.model';

@Component({
  imports: [ChatBaseComponent],
  template: `
    <app-chat-base
      [title]="'Custom Chat'"
      [messages]="messages"
      [displayMode]="ChatDisplayMode.WINDOW"
      (messageSent)="onMessageSent($event)">
    </app-chat-base>
  `
})
```

## SCSS Optimization

The SCSS structure has been optimized to reduce bundle size while maintaining feature completeness:

### SCSS File Structure

- `chat-base.component.scss`: Main styles and imports
- `_messages.scss`: Message bubble and types styling
- `_display-modes.scss`: Display mode specific styles

### Optimizations Applied

1. **Consolidated Files**:

   - Merged `_quick-options.scss` and `_responsive.scss` into main component file
   - Removed redundant selectors and properties

2. **Simplified Selectors**:

   - Used shorthand properties (e.g., `inset: 0` instead of individual properties)
   - Reduced nesting depth for better performance
   - Combined similar styles

3. **Improved Animations**:

   - Consolidated keyframes
   - Shortened transition properties

4. **Performance Improvements**:
   - Reduced specificity of selectors
   - Optimized media queries

### Message Types

The component supports these message types:

- `SENT`: User sent messages
- `RECEIVED`: Messages received from other users
- `SYSTEM`: System notifications and announcements
- `AI_ASSISTANT`: AI-generated responses with special styling

## Debug helper

You can dump chat telemetry from the browser console using the helper functions exposed by `ChatService`:

- `window.__chatGetDebug()` — returns debug telemetry object
- `window.__chatLogDebug()` — logs debug telemetry to the console
- `window.__chatEnsureStarted(timeoutMs?)` — waits for the global connection to be established

There is also a small debug component you can drop into a page for quick visual inspection:

- `shared-chat-debug` (standalone component) — shows telemetry and allows triggering `ensureGlobalConnectionStarted()`

## Demo

A demo component showcasing all chat variations is available at:
`/src/app/communication/chat-demo/chat-demo.component.ts`
