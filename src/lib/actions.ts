"use server";

import { revalidatePath } from "next/cache";
import {
  AnnouncementSchema,
  AssignmentSchema,
  AttendanceSchema,
  ClassSchema,
  ContentFileSchema,
  EventSchema,
  ExamSchema,
  LessonSchema,
  MessageSchema,
  ParentSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { requireRole, Role, AuthzError } from "./authz";
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-class");

    await prisma.class.create({
      data,
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-class");

    await prisma.class.update({
      where: {
        id: data.id,
      },
      data,
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-class");

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/classes");
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
// TEACHER
// ------------------------------------------------------------------

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-teacher");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-teacher");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-teacher");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
  let clerkUserId: string | null = null;

  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-student");

    const username = data.username.trim();
    const email = data.email?.trim() || undefined;

    if (!data.password || data.password.length < 8) {
      return { success: false, error: true, message: "Student password must be at least 8 characters." };
    }

    // parentId is the Parent primary key (the Clerk user id), not the
    // parent's South African ID number. Resolve an ID number if an older
    // form/client still sends one.
    let parentId = data.parentId.trim();
    let parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { id: true },
    });

    if (!parent && /^\d{13}$/.test(parentId)) {
      parent = await prisma.parent.findUnique({
        where: { idNumber: parentId },
        select: { id: true },
      });
      if (parent) parentId = parent.id;
    }

    if (!parent) {
      return {
        success: false,
        error: true,
        message: "The selected parent does not exist. Please select an existing parent.",
      };
    }

    const duplicate = await prisma.student.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          ...(data.phone?.trim() ? [{ phone: data.phone.trim() }] : []),
        ],
      },
      select: { username: true, email: true, phone: true },
    });

    if (duplicate) {
      const field = duplicate.username === username
        ? "username"
        : duplicate.email === email
          ? "email"
          : "phone number";
      return { success: false, error: true, message: `A student with that ${field} already exists.` };
    }

    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      select: { capacity: true, _count: { select: { students: true } } },
    });

    if (!classItem) {
      return { success: false, error: true, message: "The selected class does not exist." };
    }

    if (classItem._count.students >= classItem.capacity) {
      return { success: false, error: true, message: "The selected class is already at full capacity." };
    }

    const client = await clerkClient();

    try {
      const user = await client.users.createUser({
        username,
        password: data.password,
        firstName: data.name.trim(),
        lastName: data.surname.trim(),
        ...(email ? { emailAddress: [email] } : {}),
        publicMetadata: { role: "student" },
      });

      clerkUserId = user.id;

      await prisma.student.create({
        data: {
          id: user.id,
          username,
          name: data.name.trim(),
          surname: data.surname.trim(),
          email: email || null,
          phone: data.phone?.trim() || null,
          address: data.address.trim(),
          img: data.img || null,
          sex: data.sex,
          birthday: data.birthday,
          gradeId: data.gradeId,
          classId: data.classId,
          parentId,
        },
      });
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const clerkMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message;
        logError("Clerk rejected student account creation", err, "actions", {
          clerkUserId,
        });
        return {
          success: false,
          error: true,
          message: clerkMessage || "Clerk rejected the student account. Check the username, email and password.",
        };
      }
      throw err;
    }

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    if (clerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(clerkUserId);
      } catch (cleanupError) {
        logError("Failed to roll back Clerk student after database error", cleanupError, "actions");
      }
    }

    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }

    if (err instanceof AuthzError) {
      return {
        success: false,
        error: true,
        message: err.message === "FORBIDDEN"
          ? "You do not have permission to create a student."
          : "Your session has expired. Please sign in again.",
      };
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return { success: false, error: true, message: "A student with one of these unique details already exists." };
      }
      if (err.code === "P2003") {
        return { success: false, error: true, message: "The selected parent, grade or class is invalid." };
      }
    }

    logError("Server action failed while creating student", err, "actions");
    return {
      success: false,
      error: true,
      message: "Unable to create the student. Please try again.",
    };
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-student");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-student");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
  let clerkUserId: string | null = null;

  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-parent");

    const username = data.username.trim();
    const name = data.name.trim();
    const surname = data.surname.trim();
    const email = data.email?.trim() || "";
    const phone = data.phone.trim();
    const address = data.address.trim();
    const idNumber = data.idNumber.trim();

    if (!data.password || data.password.length < 8) {
      return { success: false, error: true, message: "Password must be at least 8 characters long." };
    }

    // Fast local duplicate check before making the remote Clerk request.
    const duplicate = await prisma.parent.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          { phone },
          { idNumber },
        ],
      },
      select: { username: true, email: true, phone: true, idNumber: true },
    });

    if (duplicate) {
      const field = duplicate.username === username
        ? "username"
        : duplicate.email === email && email
          ? "email"
          : duplicate.phone === phone
            ? "phone number"
            : "ID/passport number";
      return { success: false, error: true, message: `That ${field} is already registered to another parent.` };
    }

    const client = await clerkClient();
    const user = await client.users.createUser({
      username,
      password: data.password,
      firstName: name,
      lastName: surname,
      ...(email ? { emailAddress: [email] } : {}),
      publicMetadata: { role: "parent" },
    });
    clerkUserId = user.id;

    try {
      await prisma.parent.create({
        data: {
          id: user.id,
          username,
          name,
          surname,
          email: email || null,
          phone,
          address,
          idType: data.idType,
          idNumber,
        },
      });
    } catch (dbError) {
      try {
        await client.users.deleteUser(user.id);
      } catch (rollbackError) {
        logError("Failed to roll back Clerk parent after database failure", rollbackError, "actions", { clerkUserId: user.id });
      }
      throw dbError;
    }

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }

    // Clerk's SDK exposes structured 422 validation errors. Always convert
    // those into a plain serializable string before returning from a Server
    // Action. Returning the Clerk error object itself can break the RSC/server
    // action response and surface in the browser as "unexpected response".
    if (isClerkAPIResponseError(err)) {
      const message = err.errors
        .map((e) => {
          const code = e.code;
          const longMessage = e.longMessage || e.message;
          switch (code) {
            case "form_identifier_exists":
              return "That username or email is already registered in Clerk.";
            case "form_username_invalid_character":
              return "The username contains characters that Clerk does not allow.";
            case "form_username_invalid_length":
              return "The username length is not allowed by Clerk.";
            case "form_username_needs_non_number_char":
              return "The username must contain at least one non-numeric character.";
            case "form_username_cannot_be_phone_number":
              return "The username cannot be a phone number.";
            case "form_password_length_too_short":
              return "The password is too short.";
            case "form_password_length_too_long":
              return "The password is too long.";
            case "form_password_no_uppercase":
              return "The password must contain an uppercase character.";
            case "form_password_pwned":
            case "form_password_compromised":
              return "Choose a different password. Clerk rejected this password because it is compromised or has appeared in a known breach.";
            case "form_password_matches_identifier":
              return "The password cannot be the same as the username, email or phone number.";
            case "form_data_missing":
              return "Clerk is requiring an account field that is not enabled or supplied. Check your Clerk sign-in settings.";
            case "form_param_value_invalid":
            case "form_param_format_invalid":
              return longMessage || "One of the account fields has an invalid format.";
            default:
              return longMessage;
          }
        })
        .filter((m): m is string => Boolean(m));

      logError("Clerk rejected parent account creation", err, "actions", { clerkUserId });
      return {
        success: false,
        error: true,
        message: message.join(" ") || "Clerk rejected the parent account. Check the username, email and password.",
      };
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = err.meta?.target as string[] | string | undefined;
      const targetText = Array.isArray(target) ? target.join(",") : target || "field";
      const field = targetText.includes("idNumber") ? "ID/passport number"
        : targetText.includes("email") ? "email"
        : targetText.includes("phone") ? "phone number"
        : "username";
      return { success: false, error: true, message: `That ${field} is already registered to another parent.` };
    }

    logError("Server action failed", err, "actions");
    return { success: false, error: true, message: "We could not create the parent. Please try again." };
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-parent");

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
        idType: data.idType,
        idNumber: data.idNumber,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("idNumber")
    ) {
      return {
        success: false,
        error: true,
        message: "That ID/passport number is already registered to another parent.",
      };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-parent");

    // Student.parentId has no cascade, so this throws (and the generic
    // catch below reports it) if any student is still linked - matching
    // the hint ParentForm already shows on error.
    const client = await clerkClient();
    await client.users.deleteUser(id);

    await prisma.parent.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/parents");
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
    await checkRateLimit(userId, "create-exam");

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
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    await checkRateLimit(userId, "update-exam");

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
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    await checkRateLimit(userId, "delete-exam");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

// ------------------------------------------------------------------
// RESULT
// Same ownership model as exams/attendance: teachers may only record
// results for exams tied to lessons they teach; admins may act on any.
// ------------------------------------------------------------------

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "create-result");

    if (role === "teacher") {
      const exam = await prisma.exam.findUnique({
        where: { id: data.examId },
        include: { Lesson: true },
      });

      if (!exam || exam.Lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.result.create({
      data: {
        score: data.score,
        examId: data.examId,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "update-result");

    if (role === "teacher") {
      const exam = await prisma.exam.findUnique({
        where: { id: data.examId },
        include: { Lesson: true },
      });

      if (!exam || exam.Lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        examId: data.examId,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "delete-result");

    if (role === "teacher") {
      const result = await prisma.result.findUnique({
        where: { id: parseInt(id) },
        include: { exam: { include: { Lesson: true } } },
      });

      if (!result || result.exam.Lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.result.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/results");
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
// ASSIGNMENT
// ------------------------------------------------------------------

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "create-assignment");

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

    await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description || null,
        startDate: new Date(data.startDate),
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
        attachments: {
          create: (data.attachments || []).map((a) => ({
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileType: a.fileType,
            fileSize: a.fileSize,
          })),
        },
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "update-assignment");

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

    // Attachments are replaced wholesale on update rather than diffed,
    // since the form always sends the full current set (existing files
    // the teacher didn't remove, plus any newly uploaded ones). Cascade
    // delete on AssignmentAttachment means this is also what runs if the
    // assignment itself is later deleted.
    await prisma.$transaction([
      prisma.assignmentAttachment.deleteMany({
        where: { assignmentId: data.id },
      }),
      prisma.assignment.update({
        where: {
          id: data.id,
        },
        data: {
          title: data.title,
          description: data.description || null,
          startDate: new Date(data.startDate),
          dueDate: new Date(data.dueDate),
          lessonId: data.lessonId,
          attachments: {
            create: (data.attachments || []).map((a) => ({
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileType: a.fileType,
              fileSize: a.fileSize,
            })),
          },
        },
      }),
    ]);

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "delete-assignment");

    if (role === "teacher") {
      const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(id) },
        include: { Lesson: true },
      });

      if (!assignment || assignment.Lesson.teacherId !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/assignments");
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
// LESSON
// Lessons define the teacher/class/subject a slot belongs to (rather
// than attaching to an existing one, like exams/assignments/attendance
// do), so managing them is admin-only - matching the role check already
// on the lessons list page.
// ------------------------------------------------------------------

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-lesson");

    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-lesson");

    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-lesson");

    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/lessons");
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
// CONTENT FILE (shared "Content Collection" library)
// Admins can see/manage every file. Teachers can see/manage only the
// files they personally uploaded - mirrors Blackboard's per-user
// Content Collection scoping.
// ------------------------------------------------------------------

export const createContentFile = async (
  currentState: CurrentState,
  data: ContentFileSchema
) => {
  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "create-contentfile");

    await prisma.contentFile.create({
      data: {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: userId,
        uploaderRole: role,
      },
    });

    revalidatePath("/list/content");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteContentFile = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, role } = await requireRole("admin", "teacher");
    await checkRateLimit(userId, "delete-contentfile");

    if (role === "teacher") {
      const file = await prisma.contentFile.findUnique({
        where: { id: parseInt(id) },
      });

      if (!file || file.uploadedBy !== userId) {
        return { success: false, error: true };
      }
    }

    await prisma.contentFile.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/content");
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
    await checkRateLimit(userId, "delete-message");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-announcement");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-announcement");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-announcement");

    await prisma.announcement.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/announcements");
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
// EVENT
// Admin-only, same shape as Announcement: classId null means a
// school-wide event, otherwise it's scoped to one class.
// ------------------------------------------------------------------

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "create-event");

    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId || null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "update-event");

    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId || null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { userId } = await requireRole("admin");
    await checkRateLimit(userId, "delete-event");

    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/events");
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
    await checkRateLimit(userId, "create-attendance");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    await checkRateLimit(userId, "update-attendance");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
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
    await checkRateLimit(userId, "delete-attendance");

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
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};