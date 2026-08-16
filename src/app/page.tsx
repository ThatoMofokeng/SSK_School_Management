"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Not signed in, go to sign-in page
      router.replace("/sign-in");
      return;
    }

    // User is signed in, check their role
    const role = user?.publicMetadata?.role as string | undefined;

    if (role && ["admin", "teacher", "student", "parent"].includes(role)) {
      // Has valid role, redirect to their dashboard
      router.replace(`/${role}`);
    } else {
      // Signed in but no role, go to sign-in page which will show "no role" message
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Show loading while checking auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-lamaSkyLight">
      <div className="text-sm text-gray-500">Loading...</div>
    </div>
  );
}
