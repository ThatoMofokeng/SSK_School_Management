import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import { getAdminDashboardData } from "@/lib/admin-data";
import CountChart from "@/components/CountChart";
import AttendanceChart from "@/components/AttendanceChart";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

const AdminPage = async ({ searchParams }: AdminPageProps) => {
  const resolvedParams = (await searchParams) || {};
  
  // Fetch all data in a single optimized call
  const { userCounts, studentStats, announcements, attendanceData } = await getAdminDashboardData();

  // Process attendance data
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thurs", "Fri"];
  
  const attendanceMap: { [key: string]: { present: number; absent: number } } = {
    Mon: { present: 0, absent: 0 },
    Tue: { present: 0, absent: 0 },
    Wed: { present: 0, absent: 0 },
    Thurs: { present: 0, absent: 0 },
    Fri: { present: 0, absent: 0 },
  };

  attendanceData.forEach(item => {
    const itemDate = new Date(item.date);
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dayName = daysOfWeek[dayOfWeek - 1];
      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  const attendanceChartData = daysOfWeek.map((day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* USER CARDS */}
        <div className="flex gap-4 justify-between flex-wrap">
          <div className="rounded-2xl bg-lamaPurple p-4 flex-1 min-w-[130px] border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">2025/07/</span>
              <Image src="/more.png" alt="" width={20} height={20} />
            </div>
            <h1 className="text-2xl font-semibold my-4">{userCounts.admin}</h1>
            <h2 className="capitalize text-sm font-medium text-gray-500">Admins</h2>
          </div>
          
          <div className="rounded-2xl bg-lamaYellow p-4 flex-1 min-w-[130px] border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">2025/07/</span>
              <Image src="/more.png" alt="" width={20} height={20} />
            </div>
            <h1 className="text-2xl font-semibold my-4">{userCounts.teacher}</h1>
            <h2 className="capitalize text-sm font-medium text-gray-500">Teachers</h2>
          </div>
          
          <div className="rounded-2xl bg-lamaPurple p-4 flex-1 min-w-[130px] border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">2025/07/</span>
              <Image src="/more.png" alt="" width={20} height={20} />
            </div>
            <h1 className="text-2xl font-semibold my-4">{userCounts.student}</h1>
            <h2 className="capitalize text-sm font-medium text-gray-500">Students</h2>
          </div>
          
          <div className="rounded-2xl bg-lamaYellow p-4 flex-1 min-w-[130px] border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">2025/07/</span>
              <Image src="/more.png" alt="" width={20} height={20} />
            </div>
            <h1 className="text-2xl font-semibold my-4">{userCounts.parent}</h1>
            <h2 className="capitalize text-sm font-medium text-gray-500">Parents</h2>
          </div>
        </div>

        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <div className="bg-white rounded-xl w-full h-full p-4">
              <div className="flex justify-between items-center">
                <h1 className="text-lg font-semibold">Students</h1>
                <Image src="/moreDark.png" alt="" width={20} height={20} />
              </div>
              <CountChart boys={studentStats.boys} girls={studentStats.girls} />
              <div className="flex justify-center gap-16">
                <div className="flex flex-col gap-1">
                  <div className="w-5 h-5 bg-lamaSky rounded-full" />
                  <h1 className="font-bold">{studentStats.boys}</h1>
                  <h2 className="text-xs text-gray-300">
                    Boys ({Math.round((studentStats.boys / (studentStats.boys + studentStats.girls)) * 100)}%)
                  </h2>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="w-5 h-5 bg-lamaYellow rounded-full" />
                  <h1 className="font-bold">{studentStats.girls}</h1>
                  <h2 className="text-xs text-gray-300">
                    Girls ({Math.round((studentStats.girls / (studentStats.boys + studentStats.girls)) * 100)}%)
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <div className="bg-white p-4 rounded-lg h-full">
              <div className="flex justify-between items-center">
                <h1 className="text-lg font-semibold">Attendance Chart</h1>
                <Image src="/moreDark.png" alt="" width={20} height={20} />
              </div>
              <AttendanceChart data={attendanceChartData} />
            </div>
          </div>
        </div>

        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          <FinanceChart />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer searchParams={resolvedParams} />
        
        {/* ANNOUNCEMENTS */}
        <div className="bg-white p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Announcements</h1>
            <span className="text-xs text-gray-400">View All</span>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            {announcements[0] && (
              <div className="bg-lamaSkyLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[0].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Intl.DateTimeFormat("en-GB").format(announcements[0].date)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[0].description}</p>
              </div>
            )}
            {announcements[1] && (
              <div className="bg-lamaPurpleLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[1].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Intl.DateTimeFormat("en-GB").format(announcements[1].date)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[1].description}</p>
              </div>
            )}
            {announcements[2] && (
              <div className="bg-lamaYellowLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[2].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Intl.DateTimeFormat("en-GB").format(announcements[2].date)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[2].description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;