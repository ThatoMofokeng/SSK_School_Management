"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const role = user?.publicMetadata?.role as string | undefined;

    if (role) {
      // Redirect to role-specific dashboard
      router.replace(`/${role}`);
    } else {
      // User is signed in but has no role - show the no-role message
      // (handled by the conditional render below)
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lamaSkyLight">
        <div className="text-sm text-gray-500">Loading SSK School Management...</div>
      </div>
    );
  }

  if (isSignedIn && !user?.publicMetadata?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lamaSkyLight px-4">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl text-center">
          <Image
            src="/SSKLogo02.png"
            alt="SSK School Management"
            width={88}
            height={88}
            className="mx-auto mb-5 object-contain"
          />
          <h1 className="text-xl font-bold text-gray-900">No role assigned</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your account is signed in but has no role yet. Contact an administrator
            to assign one before you can continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lamaSkyLight via-white to-slate-50 px-4 py-8">
      <SignIn.Root>
        <SignIn.Step
          name="start"
          className="w-full max-w-md bg-white p-7 sm:p-10 rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col gap-5"
        >
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
              <Image
                src="/SSKLogo02.png"
                alt="SSK School Management logo"
                width={84}
                height={84}
                priority
                className="h-20 w-20 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              SSK School Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Secure school management portal
            </p>
          </header>

          <Clerk.GlobalError className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" />

          <div className="flex flex-col gap-4">
            <Clerk.Field name="identifier" className="flex flex-col gap-2">
              <Clerk.Label className="text-xs font-medium text-gray-600">
                Username or email
              </Clerk.Label>
              <Clerk.Input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter your username or email"
                className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-blue-500 data-[invalid]:ring-red-400"
              />
              <Clerk.FieldError className="text-xs text-red-500" />
            </Clerk.Field>

            <Clerk.Field name="password" className="flex flex-col gap-2">
              <Clerk.Label className="text-xs font-medium text-gray-600">
                Password
              </Clerk.Label>
              <Clerk.Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-blue-500 data-[invalid]:ring-red-400"
              />
              <Clerk.FieldError className="text-xs text-red-500" />
            </Clerk.Field>
          </div>

          <SignIn.Action
            submit
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign In
          </SignIn.Action>

          <p className="text-center text-xs text-gray-400">
            SSK School Management System
          </p>
        </SignIn.Step>
      </SignIn.Root>
    </main>
  );
};

export default LoginPage;
