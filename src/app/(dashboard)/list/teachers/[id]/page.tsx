import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import Image from "next/image";
import Link from "next/link";
import Performance from "@/components/Perfomance";
import FormModal from "@/components/FormModal";
import prisma from "@/lib/prisma";
import { Teacher } from "@prisma/client";
import { notFound } from "next/navigation";
//import { role } from "@/lib/utils";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";

const SingleTeacherPage = async ({params: {id}}: { params: {id: string}}) => {

    const {  sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string})?.role;

    const teacher: (Teacher & {_count:{subjects:number; lessons:number; classes:number}}) | null = await prisma.teacher.findUnique({
        where: {id},
        include:{
            _count:{
            select:{
                subjects: true,
                lessons: true,
                classes: true,
            }
        }
        }
    })

    if (!teacher) {
        return notFound();
    }


    return (
        <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
            {/* LEFT */}
            <div className="w-full xl:w-2/3">
                {/* TOP */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* USER INFO CARD */}
                    <div className="bg-lamaSky py-6 px-4 rounded-md flex-1 flex gap-4">
                        <div className="w-1/3">
                            <Image src={teacher.img || "/noAvatar.png"} alt=""
                                width={144} height={144} className="w-36 h-36 rounded-full object-cover"></Image>
                        </div>

                        <div className="w-2/3 flex flex-col justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-semibold">{teacher.name + " " + teacher.surname}</h1>
                                {role === "admin" && (
                                <FormContainer table="teacher" type="update" data={teacher}/>
                                )}

                            </div>
                            <p className="text-sm text-gray-500">A mathematician teacher. Graduated from Wits with BA in Accounting.</p>

                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">

                                
                                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                                    <Image src='/date.png' alt="" width={14} height={14} />
                                    <span>{new Intl.DateTimeFormat("en-GB").format(teacher.birthday)}</span>

                                </div>
                                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                                    <Image src='/mail.png' alt="" width={14} height={14} />
                                    <span>{teacher.email || " - "}</span>

                                </div>
                                <div className="w-full md:w-1/3 lg:w-full 2xl:1/3 flex items-center gap-2">
                                    <Image src='/phone.png' alt="" width={14} height={14} />
                                    <span>{teacher.phone || " - "}</span>

                                </div>
                            </div>
                        </div>
                    </div>


                    {/* SMALL CARDS */}
                    <div className="flex-1 flex gap-4 justify-between flex-wrap">
                        {/* ATTANDANCE CARD */}
                        <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
                            <Image src="/singleAttendance.png" alt="" width={24} height={24} className="w-6 h-6"></Image>
                            <div className="">
                                <h1 className="text-xl font-semibold">90%</h1>
                                <span>Attendance</span>
                            </div>
                        </div>

                        {/* BRANCH CARD */}
                        <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
                            <Image src="/singleBranch.png" alt="" width={24} height={24} className="w-6 h-6"></Image>
                            <div className="">
                                <h1 className="text-xl font-semibold">{teacher._count.subjects}</h1>
                                <span>Subjects</span>
                            </div>
                        </div>

                        {/* LESSONS CARD */}
                        <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
                            <Image src="/singleLesson.png" alt="" width={24} height={24} className="w-6 h-6"></Image>
                            <div className="">
                                <h1 className="text-xl font-semibold">{teacher._count.lessons}</h1>
                                <span>Lessons</span>
                            </div>
                        </div>

                        {/* CLASSES CARD */}
                        <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
                            <Image src="/singleClass.png" alt="" width={24} height={24} className="w-6 h-6"></Image>
                            <div className="">
                                <h1 className="text-xl font-semibold">{teacher._count.classes}</h1>
                                <span>Classes</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* BOTTOM */}
                <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
                    <h1>Teacher&apos;s Schedule</h1>
                    <BigCalendarContainer type="teacherId" id={teacher.id} />
                </div>
            </div>
            {/* RIGHT */}
            <div className="w-full xl:w-1/3 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-md">
                    <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
                        <Link className="p-3 rounded-md bg-lamaSkyLight" href={'/list/classes?supervisiorId=${teacher2'}>Teachers&apos;s Classes</Link>
                        <Link className="p-3 rounded-md bg-lamaPurpleLight" href={'/list/students?teacherId=${"teacher2"}'}>Teachers&apos;s Students</Link>
                        <Link className="p-3 rounded-md bg-lamaYellowLight" href={'/list/lessons?teacherId=${"teacher2"}'}>Teachers&apos;s Lessons</Link>
                        <Link className="p-3 rounded-md bg-pink-50" href={'/list/exams?teacherId=${"teacher2"}'}>Teachers&apos;s Exams</Link>
                        <Link className="p-3 rounded-md bg-lamaSkyLight" href={'/list/assignments?teacherId=${"teacher2"}'}>Teachers&apos;s Assignments</Link>
                    </div>
                </div>
                <Performance />
                <Announcements />
            </div>
        </div>
    )
}

export default SingleTeacherPage;