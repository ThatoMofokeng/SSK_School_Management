import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const SingleAssignmentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const assignmentId = parseInt(id);

  if (isNaN(assignmentId)) {
    return notFound();
  }

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  // Same visibility rule as the list page: scoped to the lesson's own
  // teacher/class, so a student can't view another class's assignment
  // just by guessing the URL.
  const roleConditions = {
    teacher: { teacherId: currentUserId! },
    student: { class: { students: { some: { id: currentUserId! } } } },
    parent: { class: { students: { some: { parentId: currentUserId! } } } },
  };

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      ...(role === "admin"
        ? {}
        : {
            Lesson: roleConditions[role as keyof typeof roleConditions] || {},
          }),
    },
    include: {
      Lesson: {
        select: {
          name: true,
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
      },
      attachments: true,
    },
  });

  if (!assignment) {
    return notFound();
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/list/assignments"
          className="text-sm text-lamaSky hover:underline flex items-center gap-1"
        >
          &larr; All Assignments
        </Link>
        {(role === "admin" || role === "teacher") && (
          <div className="flex items-center gap-2">
            <Link
              href={`/list/assignments/${assignment.id}/edit`}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
              title="Edit"
            >
              <Image src="/edit.png" alt="" width={16} height={16} />
            </Link>
            <FormContainer
              table="assignment"
              type="delete"
              id={assignment.id}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        {assignment.Lesson.subject.name} &middot; {assignment.Lesson.class.name}
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">
        {assignment.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500 border-b border-gray-200 pb-4 mb-6">
        <span>
          Teacher: {assignment.Lesson.teacher.name}{" "}
          {assignment.Lesson.teacher.surname}
        </span>
        <span>
          Start:{" "}
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
            assignment.startDate
          )}
        </span>
        <span>
          Due:{" "}
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
            assignment.dueDate
          )}
        </span>
      </div>

      {assignment.description && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 mb-6">
          {assignment.description}
        </div>
      )}

      {assignment.attachments.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600">Attachments</h2>
          <ul className="flex flex-col gap-1">
            {assignment.attachments.map((a: { id: number; fileName: string; fileUrl: string; fileSize: number | null }) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2"
              >
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lamaSky hover:underline"
                >
                  {a.fileName}
                </a>
                <span className="text-xs text-gray-400">
                  {formatBytes(a.fileSize)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SingleAssignmentPage;
