"use client";

import {
  Bell,
  Camera,
  ChevronRight,
  Lock,
  Mail,
  Palette,
  Shield,
  User,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

type Role = "admin" | "teacher" | "student" | "parent" | "User";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading settings...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const role = ((user.publicMetadata?.role as Role | undefined) ?? "User");

  const fullName =
    user.fullName || user.firstName || user.username || "SSK User";

  const email = user.primaryEmailAddress?.emailAddress || "No email available";

  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so choosing the same file again still fires onChange

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      toast.success("Profile picture updated.");
    } catch (err) {
      console.error("Profile image upload failed", err);
      toast.error("Couldn't update your profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your SSK School Management account and preferences.
          </p>
        </div>

        {/* Profile card */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {user.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={fullName}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full border-2 border-slate-100 object-cover shadow-sm"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-100 bg-blue-600 text-xl font-bold text-white shadow-sm"
                    aria-hidden="true"
                  >
                    {initials || <User className="h-8 w-8" />}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile picture"
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? (
                    <span
                      className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden="true"
                    />
                  ) : (
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
                <p className="text-sm text-slate-500">{email}</p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
              {role}
            </span>
          </div>
        </section>

        {/* Settings sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account */}
          <SettingsSection
            title="Account"
            description="Manage your personal account information."
            icon={<User className="h-5 w-5" aria-hidden="true" />}
          >
            <SettingsItem
              icon={<User className="h-4 w-4" aria-hidden="true" />}
              title="Profile"
              description="Update your name and profile picture from the card above."
              onClick={() => router.push("/settings/profile")}
            />
            <SettingsItem
              icon={<Mail className="h-4 w-4" aria-hidden="true" />}
              title="Email address"
              description={email}
              onClick={() => router.push("/settings/profile")}
            />
          </SettingsSection>

          {/* Security */}
          <SettingsSection
            title="Security"
            description="Protect your account and manage access."
            icon={<Shield className="h-5 w-5" aria-hidden="true" />}
          >
            <SettingsItem
              icon={<Lock className="h-4 w-4" aria-hidden="true" />}
              title="Password"
              description="Change your account password."
              onClick={() => router.push("/settings/security")}
            />
            <SettingsItem
              icon={<Shield className="h-4 w-4" aria-hidden="true" />}
              title="Security settings"
              description="Manage authentication and account security."
              onClick={() => router.push("/settings/security")}
            />
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection
            title="Notifications"
            description="Control how SSK communicates with you."
            icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          >
            <SettingsItem
              icon={<Bell className="h-4 w-4" aria-hidden="true" />}
              title="Notifications"
              description="Manage school announcements and alerts."
              comingSoon
            />
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection
            title="Appearance"
            description="Customize the appearance of your dashboard."
            icon={<Palette className="h-5 w-5" aria-hidden="true" />}
          >
            <SettingsItem
              icon={<Palette className="h-4 w-4" aria-hidden="true" />}
              title="Theme"
              description="Choose how the application looks."
              comingSoon
            />
          </SettingsSection>
        </div>

        {/* Account information */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Account information
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={fullName} />
            <Info label="Email" value={email} />
            <Info label="Role" value={role} capitalize />
            <Info label="Username" value={user.username || "Not set"} />
          </div>
        </section>

        {/* Footer */}
        <div className="py-8 text-center text-xs text-slate-400">
          SSK School Management System
        </div>
      </div>
    </main>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function SettingsItem({
  icon,
  title,
  description,
  onClick,
  comingSoon = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  // A clickable-looking row that silently does nothing on click is worse
  // than one that's honestly disabled — this makes "not built yet" a
  // visible, expected state instead of a dead end.
  if (comingSoon) {
    return (
      <div
        className="flex w-full cursor-not-allowed items-center gap-4 p-5 text-left opacity-60"
        aria-disabled="true"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {title}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Coming soon
            </span>
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
        aria-hidden="true"
      />
    </button>
  );
}

function Info({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-medium text-slate-800 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}