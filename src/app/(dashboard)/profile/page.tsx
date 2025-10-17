import Image from "next/image";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const ProfilePage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Handle missing user or role
  if (!userId || !role) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-gray-500 mt-2">
        You&apos;re not signed in or your role is missing.
        </p>
      </div>
    );
  }

  // Declare a profile variable with a broad type
  let profile: any = null;

  // Fetch profile based on role
  if (role === "admin") {
    profile = await prisma.admin.findUnique({ where: { id: userId } });
  } else if (role === "teacher") {
    profile = await prisma.teacher.findUnique({ where: { id: userId } });
  } else if (role === "student") {
    profile = await prisma.student.findUnique({ where: { id: userId } });
  } else if (role === "parent") {
    profile = await prisma.parent.findUnique({ where: { id: userId } });
  }

  // Handle missing profile
  if (!profile) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">Profile</h1>
       
        <p className="text-gray-500 mt-2">We couldn&apos;t find your profile record.</p>

      </div>
    );
  }

  // Extract common fields safely
  const c = {
    name: profile.name ?? profile.username ?? "-",
    surname: profile.surname ?? "",
    email: profile.email ?? "-",
    phone: profile.phone ?? "-",
    address: profile.address ?? "-",
    img: profile.img ?? "/noAvatar.jpg",
    username: profile.username ?? "-",
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-md p-6 flex items-start gap-6 shadow">
        <Image
          src={c.img}
          alt="Avatar"
          width={96}
          height={96}
          className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
        />

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                {c.name} {c.surname}
              </h1>
              <p className="text-sm text-gray-500 capitalize">{role}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-600">Username</h3>
              <p className="mt-1">{c.username}</p>
            </div>
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-600">Email</h3>
              <p className="mt-1">{c.email}</p>
            </div>
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-600">Phone</h3>
              <p className="mt-1">{c.phone}</p>
            </div>
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-600">Address</h3>
              <p className="mt-1">{c.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
