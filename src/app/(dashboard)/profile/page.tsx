import Image from "next/image";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["admin", "teacher", "student", "parent"] as const;
type ProfileRole = (typeof VALID_ROLES)[number];

// Admin, Teacher, Student, and Parent are four different Prisma models —
// only Admin lacks the display fields below (it's just id + username).
// This shape describes exactly what this page reads, so a fetched record
// from any of the four models is structurally assignable here without
// resorting to `any` or a fragile 4-way type intersection.
type ProfileRecord = {
  username: string;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  img?: string | null;
};

function isValidRole(value: string | undefined): value is ProfileRole {
  return !!value && (VALID_ROLES as readonly string[]).includes(value);
}

const ProfileMessage = ({ message }: { message: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center p-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  </div>
);

const ProfilePage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !isValidRole(role)) {
    return <ProfileMessage message="You're not signed in or your role is missing." />;
  }

  let profile: ProfileRecord | null = null;

  switch (role) {
    case "admin":
      profile = await prisma.admin.findUnique({ where: { id: userId } });
      break;
    case "teacher":
      profile = await prisma.teacher.findUnique({ where: { id: userId } });
      break;
    case "student":
      profile = await prisma.student.findUnique({ where: { id: userId } });
      break;
    case "parent":
      profile = await prisma.parent.findUnique({ where: { id: userId } });
      break;
  }

  if (!profile) {
    return <ProfileMessage message="We couldn't find your profile record." />;
  }

  // Extract common fields safely — Admin has no name/surname/etc, so
  // each falls back sensibly rather than rendering "undefined".
  const c = {
    name: profile.name ?? profile.username,
    surname: profile.surname ?? "",
    email: profile.email ?? "-",
    phone: profile.phone ?? "-",
    address: profile.address ?? "-",
    img: profile.img ?? "/noAvatar.jpg",
    username: profile.username,
  };

  const fullName = `${c.name} ${c.surname}`.trim();

  return (
    <div className="p-4">
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
        <Image
          src={c.img}
          alt={fullName ? `${fullName}'s profile picture` : "Profile picture"}
          width={96}
          height={96}
          className="h-24 w-24 rounded-full border-4 border-blue-500 object-cover"
        />

        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
          <p className="text-sm capitalize text-slate-500">{role}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProfileField label="Username" value={c.username} />
            <ProfileField label="Email" value={c.email} />
            <ProfileField label="Phone" value={c.phone} />
            <ProfileField label="Address" value={c.address} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </h3>
    <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
  </div>
);

export default ProfilePage;