import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AssignmentFormPage from "@/components/AssignmentFormPage";

const NewAssignmentPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  // Middleware already blocks other roles from reaching this route;
  // this is just a defensive backstop consistent with the rest of the
  // app's pages.
  if (role !== "admin" && role !== "teacher") {
    redirect("/list/assignments");
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
      type="create"
      relatedData={{ lessons, contentFiles }}
    />
  );
};

export default NewAssignmentPage;
