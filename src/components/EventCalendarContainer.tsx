import Image from "next/image";
import EventCalender from "./EventCalendar";
import EventList from "./EventList";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  // safe: searchParams?.date will be string | undefined
  const date = searchParams?.date;

  return (
    <div className="bg-white p-4 rounded-md">
      <EventCalender />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
        <Image src="/moreDark.png" alt="More" width={20} height={20} priority />
      </div>
      <div className="flex flex-col gap-4">
        <EventList dateParam={date} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
