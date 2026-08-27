import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement"
    | "message";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

type UserContext = {
  userId: string | null;
  role?: string;
};

// React cache() deduplicates these calls during a single server render.
// FormContainer is rendered once per table row, so this prevents dozens of
// identical Clerk auth calls from being made on list pages.
const getUserContext = cache(async (): Promise<UserContext> => {
  const { userId, sessionClaims } = await auth();
  return {
    userId,
    role: (sessionClaims?.metadata as { role?: string })?.role,
  };
});

// Related dropdown data is shared by all FormContainer instances for the
// same table/user during one render. This is one of the biggest performance
// wins for pages with many rows and edit buttons.
const getRelatedData = cache(
  async (table: FormContainerProps["table"], role?: string, currentUserId?: string | null) => {
    switch (table) {
      case "subject": {
        const teachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
          take: 200,
          orderBy: { name: "asc" },
        });
        return { teachers };
      }

      case "class": {
        const [grades, teachers] = await Promise.all([
          prisma.grade.findMany({
            select: { id: true, level: true },
            take: 100,
            orderBy: { level: "asc" },
          }),
          prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
        ]);
        return { teachers, grades };
      }

      case "teacher": {
        const subjects = await prisma.subject.findMany({
          select: { id: true, name: true },
          take: 200,
          orderBy: { name: "asc" },
        });
        return { subjects };
      }

      case "student": {
        const [grades, classes, parents] = await Promise.all([
          prisma.grade.findMany({
            select: { id: true, level: true },
            take: 100,
            orderBy: { level: "asc" },
          }),
          prisma.class.findMany({
            select: {
              id: true,
              name: true,
              capacity: true,
              _count: { select: { students: true } },
            },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.parent.findMany({
            select: { id: true, name: true, surname: true, idNumber: true },
            take: 500,
            orderBy: { name: "asc" },
          }),
        ]);
        return { classes, grades, parents };
      }

      case "exam": {
        const lessons = await prisma.lesson.findMany({
          where: role === "teacher" ? { teacherId: currentUserId! } : {},
          select: { id: true, name: true },
          take: 200,
          orderBy: { name: "asc" },
        });
        return { lessons };
      }

      case "assignment": {
        const [lessons, contentFiles] = await Promise.all([
          prisma.lesson.findMany({
            where: role === "teacher" ? { teacherId: currentUserId! } : {},
            select: { id: true, name: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.contentFile.findMany({
            where: role === "admin" ? {} : { uploadedBy: currentUserId! },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              uploadedBy: true,
              uploaderRole: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        ]);
        return { lessons, contentFiles };
      }

      case "lesson": {
        const [subjects, classes, teachers] = await Promise.all([
          prisma.subject.findMany({
            select: { id: true, name: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.class.findMany({
            select: { id: true, name: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
        ]);
        return { subjects, classes, teachers };
      }

      case "event": {
        const classes = await prisma.class.findMany({
          select: { id: true, name: true },
          take: 200,
          orderBy: { name: "asc" },
        });
        return { classes };
      }

      case "result": {
        const [exams, assignments, students] = await Promise.all([
          prisma.exam.findMany({
            where: role === "teacher" ? { Lesson: { teacherId: currentUserId! } } : {},
            select: { id: true, title: true },
            take: 200,
            orderBy: { title: "asc" },
          }),
          prisma.assignment.findMany({
            where: role === "teacher" ? { Lesson: { teacherId: currentUserId! } } : {},
            select: { id: true, title: true },
            take: 200,
            orderBy: { title: "asc" },
          }),
          prisma.student.findMany({
            where:
              role === "teacher"
                ? { class: { lessons: { some: { teacherId: currentUserId! } } } }
                : {},
            select: { id: true, name: true, surname: true },
            take: 500,
            orderBy: { name: "asc" },
          }),
        ]);
        return { exams, assignments, students };
      }

      case "message": {
        const [admins, teachers, students, parents] = await Promise.all([
          prisma.admin.findMany({
            select: { id: true, username: true },
            take: 50,
            orderBy: { username: "asc" },
          }),
          prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.student.findMany({
            select: { id: true, name: true, surname: true },
            take: 500,
            orderBy: { name: "asc" },
          }),
          prisma.parent.findMany({
            select: { id: true, name: true, surname: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
        ]);

        const recipients = [
          ...admins.map((a) => ({ id: a.id, role: "admin" as const, label: a.username })),
          ...teachers.map((t) => ({ id: t.id, role: "teacher" as const, label: `${t.name} ${t.surname}` })),
          ...students.map((s) => ({ id: s.id, role: "student" as const, label: `${s.name} ${s.surname}` })),
          ...parents.map((p) => ({ id: p.id, role: "parent" as const, label: `${p.name} ${p.surname}` })),
        ].filter((recipient) => recipient.id !== currentUserId);

        return { recipients };
      }

      case "attendance": {
        const [lessons, students] = await Promise.all([
          prisma.lesson.findMany({
            where: role === "teacher" ? { teacherId: currentUserId! } : {},
            select: { id: true, name: true },
            take: 200,
            orderBy: { name: "asc" },
          }),
          prisma.student.findMany({
            where:
              role === "teacher"
                ? { class: { lessons: { some: { teacherId: currentUserId! } } } }
                : {},
            select: { id: true, name: true, surname: true },
            take: 500,
            orderBy: { name: "asc" },
          }),
        ]);
        return { lessons, students };
      }

      case "announcement": {
        const classes = await prisma.class.findMany({
          select: { id: true, name: true },
          take: 200,
          orderBy: { name: "asc" },
        });
        return { classes };
      }

      // Parent and delete-only forms need no related-data query.
      case "parent":
      default:
        return {};
    }
  }
);

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  // Delete forms never need database lookups before opening the modal.
  // Parent forms also have no related dropdown data, so they can render
  // without a Clerk auth request for every row.
  const needsUserContext =
    type !== "delete" &&
    ["exam", "assignment", "result", "message", "attendance"].includes(table);

  const context = needsUserContext ? await getUserContext() : undefined;
  const relatedData =
    type !== "delete"
      ? await getRelatedData(table, context?.role, context?.userId)
      : {};

  return (
    <div>
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
