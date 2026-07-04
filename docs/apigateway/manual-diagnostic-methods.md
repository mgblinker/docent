---
type: howto
---

# Alternative Diagnostic Methods

Since the automatic script couldn't find the ChatApiService, let's try these manual approaches:

## Method 1: Direct Angular Debugging

In both browser consoles, try:

```javascript
// 1. Check if Angular is available
console.log("Angular available:", !!window.ng);

// 2. Find all Angular components
const allElements = Array.from(document.querySelectorAll("*"));
const angularElements = allElements.filter((el) => window.ng?.getContext?.(el));
console.log("Angular elements found:", angularElements.length);

// 3. Try to find any service
let foundServices = [];
angularElements.forEach((el, i) => {
  try {
    const context = window.ng.getContext(el);
    if (context?.injector) {
      // Try common service names
      const serviceNames = ["ChatService", "ChatApiService", "UserApiService"];
      serviceNames.forEach((name) => {
        try {
          const service = context.injector.get(name);
          if (service) {
            foundServices.push({ element: i, serviceName: name, service });
          }
        } catch {}
      });
    }
  } catch {}
});

console.log("Found services:", foundServices);
```

## Method 2: Browser DevTools Inspection

1. **Open DevTools** (F12)
2. **Go to Application tab** → **Local Storage** or **Session Storage**
3. **Look for authentication tokens** containing user identifiers
4. **Check for entries like**:
   - `auth_token`
   - `jwt_token`
   - `user_info`
   - `contact_id`

## Method 3: Network Tab Analysis

1. **Open DevTools** → **Network tab**
2. **Filter for "SignalR" or "negotiate"**
3. **Look for SignalR connection requests**
4. **Check request headers for Authorization tokens**
5. **Decode JWT tokens** to see user claims

## Method 4: Manual SignalR Test

If you can find the chat service, try these commands:

```javascript
// Replace 'service' with whatever you found above
const service = foundServices[0]?.service;

if (service && service.getConnectionInfo) {
  await service.getConnectionInfo();
}

if (service && service.testMessageDelivery) {
  await service.testMessageDelivery(
    "534c1d7d-c093-407d-981c-b7af7cdbf19d",
    "test"
  );
}
```

## Method 5: JWT Token Inspection

Paste this to decode any JWT tokens you find:

```javascript
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    console.log("JWT payload:", payload);
    console.log("Contact ID (cid):", payload.cid);
    console.log("Subject (sub):", payload.sub);
    return payload;
  } catch (error) {
    console.error("Invalid JWT:", error);
  }
}

// Use it like: decodeJWT('your_jwt_token_here')
```

## What We're Looking For

The key information we need:

1. **Current user's contact ID** from JWT token
2. **SignalR connection user ID** that backend sees
3. **Whether these two match**

From the backend logs, we know:

- Sender should be: `bd0b3895-253c-4fa6-aea6-e78f2d80519b`
- Recipient should be: `534c1d7d-c093-407d-981c-b7af7cdbf19d`

Try these methods and let me know what you find!
