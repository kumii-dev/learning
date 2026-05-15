# Kumii Learning Hub — Lovable In    async function handleMessage(event: MessageEvent) {
      // Only accept messages from the Learning Hub iframe origin
      if (event.origin !== HUB_ORIGIN) return;

      if (event.data?.type === "REQUEST_AUTH_TOKEN") {
        // The hub retries every 500 ms until it gets a reply — deduplicate
        // with a ref flag so we only do the async work once per session.
        if (respondedRef.current) return;
        respondedRef.current = true;

        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        const persona =
          data?.session?.user?.user_metadata?.persona ?? "learner";

        if (token && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "KUMII_AUTH_TOKEN", token, persona },
            HUB_ORIGIN
          );
        }
      }> Copy everything below this line and paste it into Lovable.

---

## Task: Integrate the Kumii Learning Hub iFrame into Kumii

The Kumii Learning Hub is a separate React app hosted at:
**`https://learning-mu-hazel.vercel.app`**

It is designed to run **inside an `<iframe>` embedded in Kumii**. When it loads, it sends a `postMessage` to the Kumii parent window requesting the logged-in user's JWT. Kumii must listen for this request and reply with the token. If Kumii does not reply within 10 seconds, the hub shows:

> `Authentication failed: [authBridge] Timed out waiting for KUMII_AUTH_TOKEN`

### What you need to build

#### 1. Add an iframe component

Create a page or component that renders the Learning Hub inside an iframe:

```tsx
// Example: src/pages/LearningHub.tsx (or wherever makes sense in Kumii)

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client"; // adjust import path

const HUB_ORIGIN = "https://learning-mu-hazel.vercel.app";

export default function LearningHub() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Prevent re-responding to the hub's 500 ms retry loop
  const respondedRef = useRef(false);

  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      // Only accept messages from the Learning Hub
      if (event.origin !== HUB_ORIGIN) return;

      if (event.data?.type === "REQUEST_AUTH_TOKEN") {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        const persona =
          data?.session?.user?.user_metadata?.persona ?? "learner";

        if (token && iframeRef.current?.contentWindow) {
          // Reply ONLY to the iframe — never use "*" as target
          iframeRef.current.contentWindow.postMessage(
            { type: "KUMII_AUTH_TOKEN", token, persona },
            HUB_ORIGIN
          );
        }
      }

      // Handle outgoing events from the Learning Hub
      if (event.data?.type === "COURSE_COMPLETED") {
        console.log("Course completed:", event.data.courseId);
        // TODO: update Kumii UI, show congratulations, refresh profile, etc.
      }

      if (event.data?.type === "CERTIFICATE_ISSUED") {
        console.log("Certificate issued:", event.data.certId);
        // TODO: show a toast notification or update the user profile badge
      }

      if (event.data?.type === "NAVIGATE_TO_PROFILE") {
        // TODO: navigate to the user's Kumii profile page
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
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
      allow="clipboard-write"
    />
  );
}
```

#### 2. Add a nav link / route to the Learning Hub page

Add a route in your router (e.g. `/learning`) that renders the `LearningHub` component above. Add a link in the sidebar or nav so users can access it.

#### 3. Rules — do not change these

- The `postMessage` reply **must** use `iframeRef.current.contentWindow.postMessage(...)` targeted at `HUB_ORIGIN` — **never `"*"`**.
- The reply message **must** have exactly this shape:
  ```json
  { "type": "KUMII_AUTH_TOKEN", "token": "<supabase_jwt>", "persona": "learner" }
  ```
- Valid `persona` values: `"learner"` | `"instructor"` | `"admin"`. Default to `"learner"` if not set in `user_metadata`.
- The listener must be on the **same component** that renders the `<iframe>` because `event.source` will be the iframe's `contentWindow`.
- The user must be **logged in** before reaching this page. Wrap the route with your existing auth guard if needed.

#### 4. Supabase `user_metadata` persona (optional but recommended)

To control whether a user sees instructor/admin features in the Learning Hub, set `persona` in their Supabase `user_metadata` when they sign up or via the Kumii admin panel:

```ts
await supabase.auth.updateUser({
  data: { persona: "learner" } // or "instructor" | "admin"
});
```

If `persona` is not set, the hub defaults to `"learner"` (read-only access).

---

That's everything needed. Once the listener is in place and the iframe is mounted, the Learning Hub at `https://learning-mu-hazel.vercel.app` will authenticate silently using the logged-in Kumii user's session.
