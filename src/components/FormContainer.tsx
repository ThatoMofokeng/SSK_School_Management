import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

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
}




const FormContainer =  async ({
    table,
    type,
    data,
    id,
}: (FormContainerProps)
    


) => {
    let relatedData = {};

    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    const currentUserId = userId;

    if (type !== "delete"){
        switch (table) {
            case "subject":
                const subjectTeachers = await prisma.teacher.findMany({
                    select: { id: true, name: true, surname: true },
                    take: 500,
                });
                relatedData = { teachers: subjectTeachers};
                break;

                case "class":
                    const classGrades = await prisma.grade.findMany({
                        select: { id: true, level: true },
                        take: 100,
                    });

                    const classTeachers = await prisma.teacher.findMany({
                        select: { id: true, name: true, surname: true },
                        take: 500,
                    });
                    relatedData = { teachers: classTeachers, grades: classGrades};
                    break;
                case "teacher": {
                    const teacherSubjects = await prisma.subject.findMany({
                        select: { id: true, name: true },
                        take: 500,
                    });
                    relatedData = { subjects: teacherSubjects };
                    break;
                }
                case "student": {
                    const studentGrades = await prisma.grade.findMany({
                        select: { id: true, level: true },
                        take: 100,
                    });
                    const studentClasses = await prisma.class.findMany({
                        include: { _count: { select: { students: true } } },
                        take: 500,
                    });
                    relatedData = { classes: studentClasses, grades: studentGrades };
                    break;
                }
                case "exam": {
                    const examLessons = await prisma.lesson.findMany({
                        where: {
                            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
                        },
                        select: { id: true, name: true },
                        take: 500,
                    });
                    relatedData = { lessons: examLessons};
                    break;
                }
                case "assignment": {
                    const assignmentLessons = await prisma.lesson.findMany({
                        where: {
                            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
                        },
                        select: { id: true, name: true },
                        take: 500,
                    });
                    // Same scoping as the Content Collection page: admin
                    // sees everything, teacher sees only their own uploads.
                    const assignmentContentFiles = await prisma.contentFile.findMany({
                        where: role === "admin" ? {} : { uploadedBy: currentUserId! },
                        orderBy: { createdAt: "desc" },
                        take: 200,
                    });
                    relatedData = {
                        lessons: assignmentLessons,
                        contentFiles: assignmentContentFiles,
                    };
                    break;
                }
                case "lesson": {
                    const [lessonSubjects, lessonClasses, lessonTeachers] =
                        await Promise.all([
                            prisma.subject.findMany({
                                select: { id: true, name: true },
                                take: 500,
                            }),
                            prisma.class.findMany({
                                select: { id: true, name: true },
                                take: 500,
                            }),
                            prisma.teacher.findMany({
                                select: { id: true, name: true, surname: true },
                                take: 500,
                            }),
                        ]);
                    relatedData = {
                        subjects: lessonSubjects,
                        classes: lessonClasses,
                        teachers: lessonTeachers,
                    };
                    break;
                }
                case "event": {
                    const eventClasses = await prisma.class.findMany({
                        select: { id: true, name: true },
                        take: 500,
                    });
                    relatedData = { classes: eventClasses };
                    break;
                }
                case "result": {
                    // Same ownership scoping as exam/assignment creation:
                    // teachers only see exams/assignments/students tied to
                    // lessons they actually teach.
                    const [resultExams, resultAssignments, resultStudents] =
                        await Promise.all([
                            prisma.exam.findMany({
                                where:
                                    role === "teacher"
                                        ? { Lesson: { teacherId: currentUserId! } }
                                        : {},
                                select: { id: true, title: true },
                                take: 500,
                            }),
                            prisma.assignment.findMany({
                                where:
                                    role === "teacher"
                                        ? { Lesson: { teacherId: currentUserId! } }
                                        : {},
                                select: { id: true, title: true },
                                take: 500,
                            }),
                            prisma.student.findMany({
                                where:
                                    role === "teacher"
                                        ? {
                                              class: {
                                                  lessons: {
                                                      some: { teacherId: currentUserId! },
                                                  },
                                              },
                                          }
                                        : {},
                                select: { id: true, name: true, surname: true },
                                take: 500,
                            }),
                        ]);
                    relatedData = {
                        exams: resultExams,
                        assignments: resultAssignments,
                        students: resultStudents,
                    };
                    break;
                }
                case "message": {
                    // Everyone can message everyone else, so the recipient
                    // picker pulls one page of each role (capped, same as
                    // the other dropdowns) and just drops the current user.
                    const [msgAdmins, msgTeachers, msgStudents, msgParents] =
                        await Promise.all([
                            prisma.admin.findMany({
                                select: { id: true, username: true },
                                take: 100,
                            }),
                            prisma.teacher.findMany({
                                select: { id: true, name: true, surname: true },
                                take: 500,
                            }),
                            prisma.student.findMany({
                                select: { id: true, name: true, surname: true },
                                take: 500,
                            }),
                            prisma.parent.findMany({
                                select: { id: true, name: true, surname: true },
                                take: 500,
                            }),
                        ]);

                    const recipients = [
                        ...msgAdmins.map((a: { id: string; username: string }) => ({
                            id: a.id,
                            role: "admin" as const,
                            label: a.username,
                        })),
                        ...msgTeachers.map(
                            (t: { id: string; name: string; surname: string }) => ({
                                id: t.id,
                                role: "teacher" as const,
                                label: `${t.name} ${t.surname}`,
                            })
                        ),
                        ...msgStudents.map(
                            (s: { id: string; name: string; surname: string }) => ({
                                id: s.id,
                                role: "student" as const,
                                label: `${s.name} ${s.surname}`,
                            })
                        ),
                        ...msgParents.map(
                            (p: { id: string; name: string; surname: string }) => ({
                                id: p.id,
                                role: "parent" as const,
                                label: `${p.name} ${p.surname}`,
                            })
                        ),
                    ].filter((recipient) => recipient.id !== currentUserId);

                    relatedData = { recipients };
                    break;
                }
                case "attendance": {
                    const attendanceLessons = await prisma.lesson.findMany({
                        where: {
                            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
                        },
                        select: { id: true, name: true },
                        take: 500,
                    });

                    const attendanceStudents = await prisma.student.findMany({
                        where: {
                            ...(role === "teacher"
                                ? { class: { lessons: { some: { teacherId: currentUserId! } } } }
                                : {}),
                        },
                        select: { id: true, name: true, surname: true },
                        take: 500,
                    });

                    relatedData = { lessons: attendanceLessons, students: attendanceStudents };
                    break;
                }
                case "announcement": {
                    const announcementClasses = await prisma.class.findMany({
                        select: { id: true, name: true },
                        take: 500,
                    });
                    relatedData = { classes: announcementClasses };
                    break;
                }
                default: break;

        }
    }



    return (
        <div className=""><FormModal table={table} type={type} data={data} id={id} relatedData={relatedData}/></div>
    )
}

export default FormContainer;