import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import AssignmentFormPage from "@/components/AssignmentFormPage";

const EditAssignmentPage = async ({
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

  if (role !== "admin" && role !== "teacher") {
    redirect("/list/assignments");
  }

  // Teachers can only edit assignments tied to lessons they actually
  // teach - middleware only checks the role, not ownership of this
  // specific assignment.
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      ...(role === "teacher"
        ? { Lesson: { teacherId: currentUserId! } }
        : {}),
    },
    include: { attachments: true },
  });

  if (!assignment) {
    return notFound();
  }

  const [lessons, contentFiles] = await Promise.all([
    prisma.lesson.findMany({
      where: role === "teacher" ? { teacherId: currentUserId! } : {},
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.contentFile.findMany({
      where: role === "admin" ? {} : { uploadedBy: currentUserId! },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <AssignmentFormPage
      type="update"
      data={assignment}
      relatedData={{ lessons, contentFiles }}
    />
  );
};

export default EditAssignmentPage;
