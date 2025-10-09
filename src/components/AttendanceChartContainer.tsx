import Image from "next/image";
import AttendanceChart from "./AttendanceChart"
import prisma from "@/lib/prisma";

const AttendanceChartContainer = async () => {

    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const lastMonday = new Date(today);

    lastMonday.setDate(today.getDate() - daysSinceMonday);

    const resData = await prisma.attandance.findMany({
        where: {
            date: {
                gte: lastMonday,
            },
        },
        select: {
            date: true,
            present: true,
        },
    });

    const daysOfWeek = ["Mon", "Tue", "Wed", "Thurs", "Fri"];

    const attendanceMap: { [key: string]: {present:number; absent: number}} = {
        Mon : { present: 0, absent: 0},
        Tue : { present: 0, absent: 0},
        Wed : { present: 0, absent: 0},
        Thurs : { present: 0, absent: 0},
        Fri : { present: 0, absent: 0},
    };

    resData.forEach(item=>{
        const itemDate = new Date(item.date)

        if (dayOfWeek >= 1 && dayOfWeek <= 5){
            const dayDame = daysOfWeek[dayOfWeek - 1];

            if (item.present) {
                attendanceMap[dayDame].present += 1;
            } else {
                attendanceMap[dayDame].absent += 1;
            }

        }
    });

    const data = daysOfWeek.map((day) => ({
        name: day,
        present: attendanceMap[day].present,
        absent: attendanceMap[day].absent,
    }))

    return (
        <div className='bg-white p-4 rounded-lg h-full'>
      <div className='flex justify-between items-center'>
        <h1 className='text-lg font-semibold'>Attendance Chart</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <AttendanceChart data={data} />
      </div>
    )
}

export default AttendanceChartContainer;