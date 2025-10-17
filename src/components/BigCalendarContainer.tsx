import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalendar";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";

const BigCalendarContiner = async ({type, id}:{type: "teacherId" | "classId";
    id: string | number;
}) => {
    try {
        const dataRes = await prisma.lesson.findMany({
            where: {
                ...(type === "teacherId" ? {teacherId: id as string} : {classId: id as number}),
            },
            take: 50, // Limit results to prevent large queries
        });

        const data = dataRes.map(lesson => ({
            title: lesson.name,
            start: lesson.startTime,
            end: lesson.endTime,
        }));

        const schedule = adjustScheduleToCurrentWeek(data);

        return (
            <div><BigCalendar data={schedule}/></div>
        );
    } catch (error) {
        console.error("Error fetching lesson data:", error);
        // Return empty calendar on error
        return (
            <div><BigCalendar data={[]}/></div>
        );
    }
}

export default BigCalendarContiner;