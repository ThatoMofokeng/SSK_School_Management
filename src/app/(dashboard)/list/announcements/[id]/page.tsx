import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleAnnouncementPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const announcementId = parseInt(id);

  if (isNaN(announcementId)) {
    return notFound();
  }

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  // Same visibility rule as the list page: school-wide announcements
  // (classId is null) are visible to everyone; class-specific
  // announcements are only visible to people tied to that class.
  const roleConditions = {
    teacher: { lessons: { some: { teacherId: currentUserId! } } },
    student: { students: { some: { id: currentUserId! } } },
    parent: { students: { some: { parentId: currentUserId! } } },
  };

  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      OR: [
        { classId: null },
        {
          class: roleConditions[role as keyof typeof roleConditions] || {},
        },
      ],
    },
    include: { class: true },
  });

  if (!announcement) {
    return notFound();
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/list/announcements"
          className="text-sm text-black hover:underline flex items-center gap-1"
        >
          &larr; All Announcements
        </Link>
        {role === "admin" && (
          <div className="flex items-center gap-2">
            <FormContainer
              table="announcement"
              type="update"
              data={announcement}
            />
            <FormContainer
              table="announcement"
              type="delete"
              id={announcement.id}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        Announcements
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">
        {announcement.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500 border-b border-gray-200 pb-4 mb-6">
        <span>
          {announcement.class?.name
            ? `Class: ${announcement.class.name}`
            : "All Classes"}
        </span>
        <span>
          Posted:{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(announcement.date)}
        </span>
      </div>

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {announcement.description}
      </div>
    </div>
  );
};

export default SingleAnnouncementPage;