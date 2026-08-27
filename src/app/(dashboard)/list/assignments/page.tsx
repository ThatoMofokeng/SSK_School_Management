import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/setting";
import { Assignment, Class, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

type AssignmentList = Assignment & {
  description: string | null;
  attachments: { id: number; fileName: string; fileUrl: string; fileType: string; fileSize: number | null }[];
  Lesson: {
    subject: Subject;
    class: Class;
    teacher: Teacher;
  };
};

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const resolvedSearchParams = await searchParams;

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;
  
  
  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Due Date",
      accessor: "dueDate",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];
  
  const renderRow = (item: AssignmentList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-0">
        <Link
          href={`/list/assignments/${item.id}`}
          className="flex items-center gap-4 p-4"
        >
          {item.Lesson.subject.name}
        </Link>
      </td>
      <td>{item.Lesson.class.name}</td>
      <td className="hidden md:table-cell">
        {item.Lesson.teacher.name + " " + item.Lesson.teacher.surname}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.dueDate)}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <Link
                href={`/list/assignments/${item.id}/edit`}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
                title="Edit"
              >
                <Image src="/edit.png" alt="" width={16} height={16} />
              </Link>
              <FormContainer table="assignment" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.AssignmentWhereInput = {};

  query.Lesson = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.Lesson.classId = parseInt(value);
            break;
          case "teacherId":
            query.Lesson.teacherId = value;
            break;
          case "search":
            query.Lesson.subject = {
              name: { contains: value, mode: "insensitive" },
            };
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.Lesson.teacherId = currentUserId!;
      break;
    case "student":
      query.Lesson.class = {
        students: {
          some: {
            id: currentUserId!,
          },
        },
      };
      break;
    case "parent":
      query.Lesson.class = {
        students: {
          some: {
            parentId: currentUserId!,
          },
        },
      };
      break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        Lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
        attachments: true,
      },
      take: ITEMS_PER_PAGE,
      skip: ITEMS_PER_PAGE * (p - 1),
    }),
    prisma.assignment.count({ where: query }),
  ]);
  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Assignments
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "admin" || role === "teacher") && (
              <Link
                href="/list/assignments/new"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"
                title="Create assignment"
              >
                <Image src="/create.png" alt="" width={14} height={14} />
              </Link>
            )}
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

export default AssignmentListPage;
