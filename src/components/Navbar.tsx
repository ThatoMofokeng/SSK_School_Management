import NavbarUserButton from "./NavbarUserButton";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const Navbar = async () => {

    // currentUser() already gives us the id and public metadata, so there is
    // no need to make a second Clerk auth() request for the same navbar.
    const user = await currentUser();
    const currentUserId = user?.id ?? null;
    const role = user?.publicMetadata?.role as string | undefined;

    // How many announcements this user hasn't opened the list since.
    // "Seen" is tracked via a cookie set by MarkAnnouncementsSeen when
    // the announcements page loads, so the badge clears once they've
    // actually looked at it, and climbs again as new ones come in.
    const cookieStore = await cookies();
    const lastSeenRaw = cookieStore.get("announcementsLastSeenAt")?.value;
    const lastSeenAt = lastSeenRaw ? new Date(lastSeenRaw) : new Date(0);

    const roleConditions = {
        teacher: { lessons: { some: { teacherId: currentUserId! } } },
        student: { students: { some: { id: currentUserId! } } },
        parent: { students: { some: { parentId: currentUserId! } } },
    };

    const unseenAnnouncementsCount = currentUserId
        ? await prisma.announcement.count({
              where: {
                  createdAt: { gt: lastSeenAt },
                  OR: [
                      { classId: null },
                      {
                          class:
                              roleConditions[role as keyof typeof roleConditions] || {},
                      },
                  ],
              },
          })
        : 0;

    return (
        <div className="flex items-center justify-between p-4">
            {/* Search bar */}
            <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
                <Image src="/search.png" alt="" width={14} height={14} />
                <input type="text" placeholder="Search..." className="w-[200px] p-2 bg-transparent outline-none" />
            </div>
            {/* Icons And User */}
            {/* Message */}
            <div className="flex items-center gap-6 justify-end w-full">
                <Link href="/list/messages" className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
                    <Image src="/message.png" alt="" width={20} height={20} />
                </Link>
                {/* Announcement */}
                <Link href="/list/announcements" className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative">
                    <Image src="/announcement.png" alt="" width={20} height={20} />
                    {unseenAnnouncementsCount > 0 && (
                        <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 rounded-full text-xs text-white">
                            {unseenAnnouncementsCount}
                        </div>
                    )}
                </Link>
                {/* Avatar */}
                <div className="flex flex-col">
                <span className="text-xs leading-3 font-medium">
  {user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username || "Guest"}
</span>
                    <span className="text-xs leading-3 text-gray-500">{user?.publicMetadata?.role as string}</span>
                </div>
                {/*<Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full" />*/}

                <NavbarUserButton />

            </div>

        </div>
    )
};

export default Navbar;