import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export interface AdminDashboardData {
  userCounts: {
    admin: number;
    teacher: number;
    student: number;
    parent: number;
  };
  studentStats: {
    boys: number;
    girls: number;
  };
  announcements: any[];
  attendanceData: any[];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    // Use a single transaction to fetch all data efficiently
    const [
      userCounts,
      studentStats,
      announcements,
      attendanceData
    ] = await Promise.all([
      // User counts
      Promise.all([
        prisma.admin.count(),
        prisma.teacher.count(),
        prisma.student.count(),
        prisma.parent.count(),
      ]).then(([admin, teacher, student, parent]) => ({
        admin,
        teacher,
        student,
        parent,
      })),

      // Student statistics
      prisma.student.groupBy({
        by: ["sex"],
        _count: true,
      }).then(data => {
        const boys = data.find((d) => d.sex === "MALE")?._count || 0;
        const girls = data.find((d) => d.sex === "FEMALE")?._count || 0;
        return { boys, girls };
      }),

      // Announcements
      prisma.announcement.findMany({
        take: 3,
        orderBy: { date: "desc" },
        where: {
          ...(role !== "admin" && {
            OR: [
              { classId: null },
              { 
                class: {
                  OR: [
                    { lessons: { some: { teacherId: userId! } } },
                    { students: { some: { id: userId! } } },
                    { students: { some: { parentId: userId! } } },
                  ]
                }
              },
            ],
          }),
        },
      }),

      // Attendance data
      (async () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysSinceMonday);

        return prisma.attandance.findMany({
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
      })(),
    ]);

    return {
      userCounts,
      studentStats,
      announcements,
      attendanceData,
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    // Return default values to prevent crashes
    return {
      userCounts: { admin: 0, teacher: 0, student: 0, parent: 0 },
      studentStats: { boys: 0, girls: 0 },
      announcements: [],
      attendanceData: [],
    };
  }
}

