import prisma from "@/lib/prisma";
import { logError } from "@/lib/logger";
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

    // Precompute the attendance window before the transaction — this is
    // plain JS date math, not a query, so it doesn't need to run inside it.
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMonday);

    // Genuinely run these as a single batched transaction on ONE pooled
    // connection (prisma.$transaction), rather than firing 7 independent
    // prisma calls via Promise.all. Promise.all does NOT share a
    // connection — each awaited call checks out its own connection from
    // the pool concurrently. With the shared layout's Navbar also running
    // its own unseen-announcements count on every page load, the old
    // Promise.all version routinely needed 7-8 simultaneous connections
    // for one page render, which exceeds Prisma's default engine pool
    // size (num_physical_cpus * 2 + 1, commonly 5) and produces exactly
    // the "Timed out fetching a new connection from the connection pool"
    // error. $transaction([...]) runs the same queries sequentially on a
    // single reserved connection instead.
    const [
      adminCount,
      teacherCount,
      studentCount,
      parentCount,
      studentStatsRaw,
      announcements,
      attendanceData,
    ] = await prisma.$transaction([
      prisma.admin.count(),
      prisma.teacher.count(),
      prisma.student.count(),
      prisma.parent.count(),

      prisma.student.groupBy({
        by: ["sex"],
        _count: true,
      }),

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

      prisma.attandance.findMany({
        where: {
          date: {
            gte: lastMonday,
          },
        },
        select: {
          date: true,
          present: true,
        },
      }),
    ]);

    const userCounts = {
      admin: adminCount,
      teacher: teacherCount,
      student: studentCount,
      parent: parentCount,
    };

    const studentStats = {
      boys: studentStatsRaw.find((d) => d.sex === "MALE")?._count || 0,
      girls: studentStatsRaw.find((d) => d.sex === "FEMALE")?._count || 0,
    };

    return {
      userCounts,
      studentStats,
      announcements,
      attendanceData,
    };
  } catch (error) {
    logError("Error fetching admin dashboard data", error, "admin-data");
    // Return default values to prevent crashes
    return {
      userCounts: { admin: 0, teacher: 0, student: 0, parent: 0 },
      studentStats: { boys: 0, girls: 0 },
      announcements: [],
      attendanceData: [],
    };
  }
}