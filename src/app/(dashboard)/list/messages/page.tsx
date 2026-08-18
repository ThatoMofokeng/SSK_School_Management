import FormContainer from "@/components/FormContainer";
import MarkMessageReadButton from "@/components/MarkMessageReadButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/setting";
import { Message, Prisma } from "@prisma/client";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

const MessageListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { userId } = await auth();
  const currentUserId = userId;

  const resolvedSearchParams = await searchParams;
  const { page, box, search } = resolvedSearchParams;

  const isSent = box === "sent";
  const p = page ? parseInt(page) : 1;

  const columns = [
    {
      header: isSent ? "To" : "From",
      accessor: "party",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
    },
  ];

  const renderRow = (item: Message) => {
    const partyName = isSent ? item.receiverName : item.senderName;
    const unread = !isSent && !item.isRead;

    return (
      <tr
        key={item.id}
        className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight ${
          unread ? "bg-lamaSkyLight" : ""
        }`}
      >
        <td className="flex items-center gap-2 p-4">
          {unread && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          )}
          {partyName}
        </td>
        <td>
          <div className={unread ? "font-semibold" : ""}>{item.subject}</div>
          <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">
            {item.content}
          </div>
        </td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("en-US").format(item.createdAt)}
        </td>
        <td>
          <div className="flex items-center gap-3">
            {unread && <MarkMessageReadButton id={item.id} />}
            <FormContainer table="message" type="delete" id={item.id} />
          </div>
        </td>
      </tr>
    );
  };

  // URL PARAMS CONDITION

  const query: Prisma.MessageWhereInput = isSent
    ? { senderId: currentUserId! }
    : { receiverId: currentUserId! };

  if (search) {
    query.subject = { contains: search, mode: "insensitive" };
  }

  const [data, count, unreadCount] = await prisma.$transaction([
    prisma.message.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip: ITEMS_PER_PAGE * (p - 1),
    }),
    prisma.message.count({ where: query }),
    prisma.message.count({
      where: { receiverId: currentUserId!, isRead: false },
    }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/list/messages?box=inbox"
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              !isSent ? "bg-lamaSky" : "bg-slate-100 text-gray-500"
            }`}
          >
            Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Link>
          <Link
            href="/list/messages?box=sent"
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isSent ? "bg-lamaSky" : "bg-slate-100 text-gray-500"
            }`}
          >
            Sent
          </Link>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <FormContainer table="message" type="create" />
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default MessageListPage;
