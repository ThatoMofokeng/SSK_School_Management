import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import Image from "next/image";
import Link from "next/link";
import Performance from "@/components/Perfomance";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import FormContainer from "@/components/FormContainer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SingleStudentPage({ params }: PageProps) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  // Always look the student up by the exact ID from the URL first.
  // This avoids using relation filters inside findUnique(), which Prisma does not support.
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { include: { _count: { select: { lessons: true } } } },
    },
  });

  if (!student) notFound();

  // Authorization is performed after the unique student lookup.
  if (role === "student" && userId !== student.id) notFound();
  if (role === "parent" && student.parentId !== userId) notFound();

  if (role === "teacher") {
    const teachesStudentClass = await prisma.lesson.findFirst({
      where: {
        teacherId: userId,
        classId: student.classId,
      },
      select: { id: true },
    });

    if (!teachesStudentClass) notFound();
  }

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      <div className="w-full xl:w-2/3">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-lamaSky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.jpg"}
                alt={`${student.name} ${student.surname}`}
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>

            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">{student.name} {student.surname}</h1>
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} />
                )}
              </div>

              <p className="text-sm text-gray-500">Student profile and academic information.</p>

              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="Birthday" width={14} height={14} />
                  <span>{new Intl.DateTimeFormat("en-GB").format(student.birthday)}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="Email" width={14} height={14} />
                  <span>{student.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="Phone" width={14} height={14} />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image src="/singleAttendance.png" alt="Attendance" width={24} height={24} className="w-6 h-6" />
              <Suspense fallback={<span>Loading...</span>}>
                <StudentAttendanceCard id={student.id} />
              </Suspense>
            </div>

            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image src="/singleBranch.png" alt="Grade" width={24} height={24} className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">{student.class.name.charAt(0)}</h1>
                <span>Grade</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image src="/singleLesson.png" alt="Lessons" width={24} height={24} className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">{student.class._count.lessons}</h1>
                <span>Lessons</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image src="/singleClass.png" alt="Class" width={24} height={24} className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">{student.class.name}</h1>
                <span>Class</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>Student&apos;s Schedule</h1>
          <BigCalendarContainer type="classId" id={student.class.id} />
        </div>
      </div>

      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/results?studentId=${encodeURIComponent(student.id)}`}>Student&apos;s Results</Link>
            <Link className="p-3 rounded-md bg-lamaPurpleLight" href={`/list/teachers?classId=${student.class.id}`}>Student&apos;s Teachers</Link>
            <Link className="p-3 rounded-md bg-lamaYellowLight" href={`/list/lessons?classId=${student.class.id}`}>Student&apos;s Lessons</Link>
            <Link className="p-3 rounded-md bg-pink-50" href={`/list/exams?classId=${student.class.id}`}>Student&apos;s Exams</Link>
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/assignments?classId=${student.class.id}`}>Student&apos;s Assignments</Link>
          </div>
        </div>
        <Performance />
        <Announcements />
      </div>
    </div>
  );
}
