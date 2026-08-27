"use client";

import dynamic from "next/dynamic";

// UserButton mounts its own DOM client-side in a way that doesn't
// always match what gets server-rendered first, producing a hydration
// mismatch warning in Navbar (React self-heals it, but it's worth
// avoiding the mismatch entirely rather than relying on that). Skipping
// SSR for just this button fixes it; `ssr: false` can only be used from
// inside a Client Component, hence this tiny wrapper around it.
const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

const NavbarUserButton = () => <UserButton />;

export default NavbarUserButton;
