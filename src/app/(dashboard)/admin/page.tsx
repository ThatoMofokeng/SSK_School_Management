import UserCard from "@/components/UserCard";
import CountChartContainer from "@/components/CountChartContainer";
import AttendanceChart from "@/components/AttendanceChart"
import FinanceChart from "@/components/FinanceChart";
import EventCalender from "@/components/EventCalendar";
import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";

const AdminPage = async ({
  searchParams,
}: {
searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* Left */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">

        {/* User Card */}
        <div className="flex gap-4 flex-wrap">
          <UserCard type="student" />
          <UserCard type="teacher" />
          <UserCard type="parent" />
          <UserCard type="admin" />
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* COUNT CHART */}
          <div className="w-full lg:w1/3 h-[450px]">
            <CountChartContainer />
          </div>

          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-3/3 h-[450px]">
            <AttendanceChartContainer />
          </div>
        </div>

        {/* BOTTOM CHARTS */}
        <div className="">
          <FinanceChart />
        </div>


      </div>
      {/* Right */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  )
};

export default AdminPage;
