"use client";

import Image from "next/image";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Menu.tsx is a server component (it reads currentUser() from
// @clerk/nextjs/server), so it can't hold an onClick handler itself —
// server components can't run client-side code like Clerk's signOut().
// This is the one interactive piece, split out as its own client
// component and rendered inside Menu.tsx in place of the old
// <Link href="/logout"> that pointed at a page that never existed.
const LogoutButton = () => {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      // replace, not push — after signing out, "back" shouldn't be able
      // to flash a cached protected page before middleware redirects.
      router.replace("/sign-in");
    } catch (err) {
      console.error("Sign out failed", err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Image src="/logout.png" alt="" width={20} height={20} />
      <span className="hidden lg:block">
        {loading ? "Logging out..." : "Logout"}
      </span>
    </button>
  );
};

export default LogoutButton;