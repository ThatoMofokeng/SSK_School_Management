"use server";

import { revalidatePath } from "next/cache";
import {
  AnnouncementSchema,
  AttendanceSchema,
  ClassSchema,
  ExamSchema,
  MessageSchema,
  ParentSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { requireRole, Role } from "./authz";
import { logError } from "./logger";
import { checkRateLimit, RateLimitError } from "./ratelimit";

type CurrentState = { success: boolean; error: boolean; message?: string };

// ------------------------------------------------------------------
// SUBJECT
// ------------------------------------------------------------------

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-subject");

    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-subject");

    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-subject");

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// CLASS
// ------------------------------------------------------------------

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await requireRole("admin");

    await prisma.class.create({
      data,
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await requireRole("admin");

    await prisma.class.update({
      where: {
        id: data.id,
      },
      data,
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole("admin");

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// TEACHER
// ------------------------------------------------------------------

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    await requireRole("admin");

    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      // If Clerk's instance requires an email address, omitting it here
      // left the account "incomplete" and forced a /sign-in/continue step
      // that the sign-in UI didn't handle. Pass it through when present.
      ...(data.email ? { emailAddress: [data.email] } : {}),
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await requireRole("admin");

    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole("admin");

    const client = await clerkClient();
    await client.users.deleteUser(id);

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// STUDENT
// ------------------------------------------------------------------

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    await requireRole("admin");

    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      // See note in createTeacher: pass the email through so the Clerk
      // account isn't left "incomplete" and forced into a /sign-in/continue
      // step the sign-in UI doesn't handle.
      ...(data.email ? { emailAddress: [data.email] } : {}),
      publicMetadata: { role: "student" },
    });

    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await requireRole("admin");

    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole("admin");

    const client = await clerkClient();
    await client.users.deleteUser(id);

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// PARENT
// ------------------------------------------------------------------

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    await requireRole("admin");

    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      ...(data.email ? { emailAddress: [data.email] } : {}),
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await requireRole("admin");

    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.parent.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// EXAM
// Teachers may create/update/delete exams only for their own lessons;
// admins may act on any exam. This restores and completes the
// ownership check that previously existed only as commented-out
// dead code with no enforcement at all.
// ------------------------------------------------------------------

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, role } = await requireRole("admin", "teacher");

    // Prisma's delete() `where` only accepts unique fields, so ownership
    // for teachers has to be verified with a separate lookup first rather
    // than folded into the delete's where clause.
    if (role === "teacher") {
      const exam = await prisma.exam.findUnique({
        where: { id: parseInt(id) },
        include: { Lesson: true },
      });

      if (!exam || exam.Lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// MESSAGE
// Admin/Teacher/Student/Parent are separate Prisma models (no single
// "User" table), so a recipient is identified by (role, id) rather than
// a plain foreign key. senderName/receiverName are resolved once at
// send time and stored on the row — see the comment on the Message
// model in schema.prisma for why.
// ------------------------------------------------------------------

const roleToMessageRole: Record<
  Role,
  "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
> = {
  admin: "ADMIN",
  teacher: "TEACHER",
  student: "STUDENT",
  parent: "PARENT",
};

async function getDisplayName(
  role: Role,
  id: string
): Promise<string | null> {
  switch (role) {
    case "admin": {
      const admin = await prisma.admin.findUnique({ where: { id } });
      return admin?.username ?? null;
    }
    case "teacher": {
      const teacher = await prisma.teacher.findUnique({ where: { id } });
      return teacher ? `${teacher.name} ${teacher.surname}` : null;
    }
    case "student": {
      const student = await prisma.student.findUnique({ where: { id } });
      return student ? `${student.name} ${student.surname}` : null;
    }
    case "parent": {
      const parent = await prisma.parent.findUnique({ where: { id } });
      return parent ? `${parent.name} ${parent.surname}` : null;
    }
    default:
      return null;
  }
}

export const createMessage = async (
  currentState: CurrentState,
  data: MessageSchema
) => {
  try {
    const { userId, role } = await requireRole(
      "admin",
      "teacher",
      "student",
      "parent"
    );
    await checkRateLimit(userId, "create-message");

    const [senderName, receiverName] = await Promise.all([
      getDisplayName(role, userId),
      getDisplayName(data.receiverRole, data.receiverId),
    ]);

    if (!receiverName) {
      // Recipient id doesn't match any account for that role.
      return { success: false, error: true };
    }

    await (prisma as any).message.create({
      data: {
        subject: data.subject,
        content: data.content,
        senderId: userId,
        senderRole: roleToMessageRole[role],
        senderName: senderName ?? "Unknown",
        receiverId: data.receiverId,
        receiverRole: roleToMessageRole[data.receiverRole],
        receiverName,
      },
    });

    revalidatePath("/list/messages");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteMessage = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId, role } = await requireRole(
      "admin",
      "teacher",
      "student",
      "parent"
    );

    const message = await (prisma as any).message.findUnique({
      where: { id: parseInt(id) },
    });

    // Only an admin, or someone on one side of the conversation, may
    // delete a message.
    if (
      !message ||
      (role !== "admin" &&
        message.senderId !== userId &&
        message.receiverId !== userId)
    ) {
      return { success: false, error: true };
    }

    await (prisma as any).message.delete({ where: { id: parseInt(id) } });

    revalidatePath("/list/messages");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const markMessageRead = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId } = await requireRole(
      "admin",
      "teacher",
      "student",
      "parent"
    );

    revalidatePath("/list/messages");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// ANNOUNCEMENT
// ------------------------------------------------------------------

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await requireRole("admin");

    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        classId: data.classId ? Number(data.classId) : null,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await requireRole("admin");

    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        classId: data.classId ? Number(data.classId) : null,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole("admin");

    await prisma.announcement.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};
// ------------------------------------------------------------------
// ATTENDANCE
// Same ownership model as exams: teachers may only mark/edit/delete
// attendance for lessons they teach; admins may act on any record.
// ------------------------------------------------------------------

export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.attandance.create({
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.attandance.update({
      where: {
        id: data.id,
      },
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, role } = await requireRole("admin", "teacher");

    if (role === "teacher") {
      const attendance = await prisma.attandance.findUnique({
        where: { id: parseInt(id) },
        include: { lesson: true },
      });

      if (!attendance || attendance.lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.attandance.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};
