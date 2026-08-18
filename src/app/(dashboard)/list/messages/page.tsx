import FormContainer from "@/components/FormContainer";
import MarkMessageReadButton from "@/components/MarkMessageReadButton";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/setting";
import { Message, Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

const avatarPalette = [
  "bg-lamaSky",
  "bg-lamaPurple",
  "bg-lamaYellow",
];

const avatarColor = (name: string) => {
  const code = name.charCodeAt(0) || 0;
  return avatarPalette[code % avatarPalette.length];
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

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

  const renderRow = (item: Message) => {
    const partyName = isSent ? item.receiverName : item.senderName;
    const partyLabel = isSent ? "To" : "From";
    const unread = !isSent && !item.isRead;

    return (
      <div
        key={item.id}
        className={`group flex items-start gap-4 px-4 py-4 border-b border-gray-100 hover:bg-lamaPurpleLight/40 transition-colors ${
          unread ? "bg-lamaSkyLight/60" : ""
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full ${avatarColor(
            partyName
          )} flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0`}
        >
          {initials(partyName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {unread && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              )}
              <span
                className={`text-sm truncate ${
                  unread ? "font-semibold text-gray-900" : "font-medium text-gray-800"
                }`}
              >
                {partyName}
              </span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(item.createdAt)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {partyLabel}: {isSent ? item.receiverName : item.senderName}
          </div>
          <div
            className={`text-sm mt-1 line-clamp-1 ${
              unread ? "text-gray-800 font-medium" : "text-gray-500"
            }`}
          >
            {item.subject}
            {item.subject ? " — " : ""}
            <span className="font-normal text-gray-500">{item.content}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {unread && <MarkMessageReadButton id={item.id} />}
          <FormContainer table="message" type="delete" id={item.id} />
        </div>
      </div>
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
    <div className="bg-white rounded-md flex-1 m-4 mt-0 overflow-hidden">
      {/* TOP */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-800">Course Messages</h1>
        <FormContainer table="message" type="create" />
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3 border-b border-gray-100">
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
        <TableSearch />
      </div>
      {/* LIST */}
      {data.length > 0 ? (
        <div className="flex flex-col">{data.map(renderRow)}</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
          <Image src="/mail.png" alt="" width={40} height={40} className="opacity-40" />
          <p className="text-sm">
            {isSent ? "You haven't sent any messages yet." : "Your inbox is empty."}
          </p>
        </div>
      )}
      {/* PAGINATION */}
      <div className="px-2">
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default MessageListPage;