"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Renders nothing. The "seen" cookie itself is now set server-side in
// middleware.ts (so there's no race with Next.js Link prefetching), but
// Next.js still caches the shared layout - including Navbar's unread
// badge - across client-side navigations. router.refresh() forces that
// layout to re-render on the server so it picks up the fresh cookie
// immediately, instead of waiting for a full page reload.
const RefreshNavbarOnMount = () => {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    // Only run once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default RefreshNavbarOnMount;