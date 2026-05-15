# Kumii Learning Hub — Lovable Integration Prompt

> Copy everything below this line and paste it into Lovable.

---

## Task: Integrate the Kumii Learning Hub iFrame into Kumii

The Kumii Learning Hub is a separate React app hosted at:
**`https://learning-mu-hazel.vercel.app`**

It runs **inside an `<iframe>` embedded in Kumii**. On load it sends a `postMessage` to the Kumii parent requesting the logged-in user's JWT, and **retries every 500 ms** until it gets a reply. If no reply arrives within 15 seconds it shows:

> `Authentication failed: [authBridge] Timed out waiting for KUMII_AUTH_TOKEN`

The most common cause is that Kumii's listener mounts **after** the hub's first request fires. The retry loop handles this — but only if Kumii's handler replies correctly once it mounts, and only when `getSession()` actually returns a token (Supabase may not be initialised yet on the first retry).

---

### What you need to build

#### 1. Single file change: `src/pages/LearningHubIframe.tsx`

```tsx
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client"; // adjust import path if needed

const HUB_ORIGIN = "https://learning-mu-hazel.vercel.app";

export default function LearningHubIframe() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Only set to true once we have confirmed a valid token to send.
  // If getSession() returns null (Supabase not ready yet), keep false
  // so the hub's next 500 ms retry is handled again.
  const respondedRef = useRef(false);

  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      // Ignore messages from any origin other than the hub
      if (event.origin !== HUB_ORIGIN) return;

      if (event.data?.type === "REQUEST_AUTH_TOKEN") {
        // Already replied with a good token this session — ignore retries
        if (respondedRef.current) return;

        const { data } = await supabase.auth.getSession();
        const token   = data?.session?.access_token;
        const persona = data?.session?.user?.user_metadata?.persona ?? "learner";

        // Only mark responded when we actually have a token to send.
        // If Supabase is not ready yet, token is null — do nothing and
        // let the hub's next 500 ms retry come through.
        if (token && iframeRef.current?.contentWindow) {
          respondedRef.current = true;
          iframeRef.current.contentWindow.postMessage(
            {
              type:    "KUMII_AUTH_TOKEN",
              token,                         // Supabase JWT
              persona,                       // "learner" | "instructor" | "admin"
              isAdmin: persona === "admin",  // convenience boolean
              email:   data.session.user.email,
            },
            HUB_ORIGIN  // NEVER use "*"
          );
        }
        // If token is null → do nothing, hub retries in 500 ms
      }

      // ── Outgoing events from the hub ──────────────────────────────────
      if (event.data?.type === "COURSE_COMPLETED") {
        console.log("[hub] Course completed:", event.data.courseId);
        // TODO: refresh profile badge / show congratulations toast
      }

      if (event.data?.type === "CERTIFICATE_ISSUED") {
        console.log("[hub] Certificate issued:", event.data.certId);
        // TODO: show toast / update profile achievements
      }

      if (event.data?.type === "NAVIGATE_TO_PROFILE") {
        // TODO: navigate to the Kumii profile page
      }

      if (event.data?.type === "NAVIGATE_TO_COURSES") {
        // TODO: navigate to the Kumii courses section
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={HUB_ORIGIN}
      title="Kumii Learning Hub"
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
      allow="clipboard-write"
    />
  );
}
```

#### 2. Add a protected route + nav link

Add a route (e.g. `/learning`) that renders `<LearningHubIframe />` behind your existing auth guard so only logged-in users can reach it. Add a nav link in the sidebar.

---

### Rules — do not change these

- `postMessage` reply target must be `HUB_ORIGIN` — **never `"*"`**.
- Reply message shape must be exactly:
  ```json
  {
    "type":    "KUMII_AUTH_TOKEN",
    "token":   "<supabase_jwt>",
    "persona": "learner",
    "isAdmin": false,
    "email":   "user@example.com"
  }
  ```
- Set `respondedRef.current = true` **only after confirming `token` is non-null**. If `getSession()` returns null (Supabase not ready), leave `respondedRef.current = false` so the next retry is handled.
- `window.addEventListener` must be on the same component that mounts the `<iframe>`.
- The user must be logged in before reaching this page.

---

### Why the retry loop exists

The hub (Vercel) loads in ~500 ms. Kumii's full page (React hydration + Supabase init) can take 1–3 seconds. The hub sends `REQUEST_AUTH_TOKEN` every 500 ms for up to 15 seconds, so it catches Kumii's listener no matter how slow the host page loads. The `respondedRef` guard (only flipped after a confirmed token) means Kumii won't respond multiple times.

---

### Supabase `user_metadata.persona` (optional)

To give a user instructor or admin features inside the hub:

```ts
await supabase.auth.updateUser({
  data: { persona: "admin" } // "learner" | "instructor" | "admin"
});
```

If unset, the hub defaults to `"learner"`.

---

## Additional change required in `LearningHubIframe.tsx`

### Handle token refresh requests

The hub sends `{ type: "REQUEST_AUTH_TOKEN", reason: "refresh" }` every ~50 minutes to refresh the JWT before it expires. Kumii must bypass the `respondedRef` dedupe when `reason === "refresh"`:

```tsx
if (event.data?.type === "REQUEST_AUTH_TOKEN") {
  const isRefresh = event.data?.reason === "refresh";

  // Skip dedupe check for refresh requests; use it only for initial requests
  if (!isRefresh && respondedRef.current) return;

  const { data } = await supabase.auth.getSession();
  const token   = data?.session?.access_token;
  const persona = data?.session?.user?.user_metadata?.persona ?? "learner";

  if (token && iframeRef.current?.contentWindow) {
    respondedRef.current = true; // still mark so duplicate INITIAL requests are ignored
    iframeRef.current.contentWindow.postMessage(
      {
        type:    "KUMII_AUTH_TOKEN",
        token,
        persona,
        isAdmin: persona === "admin",
        email:   data.session.user.email,
      },
      HUB_ORIGIN
    );
  }
}
```

### Reset `respondedRef` on iframe reload

If the hub iframe reloads internally (e.g. SPA navigation), it will restart the handshake. Reset `respondedRef` on the iframe's `onLoad` event so it can re-authenticate:

```tsx
<iframe
  ref={iframeRef}
  src={HUB_ORIGIN}
  title="Kumii Learning Hub"
  onLoad={() => { respondedRef.current = false; }}
  style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
  allow="clipboard-write"
/>
```
