import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/setting";
import { Parent, Prisma, Student } from "@prisma/client";
import Image from "next/image";

import { auth } from "@clerk/nextjs/server";

type ParentList = Parent & { students: Student[] };

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const resolvedSearchParams = await searchParams;

const { sessionClaims } = await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;


const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student Names",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  ...(role === "admin"
    ? [
        {
          header: "ID / Passport",
          accessor: "idNumber",
          className: "hidden lg:table-cell",
        },
      ]
    : []),
  ...(role === "admin"
    ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
    : []),
];

const renderRow = (item: ParentList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-xs text-gray-500">{item?.email}</p>
      </div>
    </td>
    <td className="hidden md:table-cell">
      {item.students.map((student) => student.name).join(",")}
    </td>
    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>
    {role === "admin" && (
      <td className="hidden lg:table-cell">
        {item.idNumber
          ? `${item.idType === "PASSPORT" ? "Passport" : "SA ID"}: ${item.idNumber}`
          : "-"}
      </td>
    )}
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="parent" type="update" data={item} />
            <FormContainer table="parent" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ParentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  // Only select fields rendered by this page. The previous `include: {
  // students: true }` loaded every student column for every parent.
  // Running the independent read queries in parallel also avoids keeping a
  // transaction open while a remote Supabase connection is doing both jobs.
  const [parents, count] = await Promise.all([
    prisma.parent.findMany({
      where: query,
      select: {
        id: true, username: true, name: true, surname: true, email: true,
        phone: true, address: true, idType: true, idNumber: true, createdAt: true,
      },
      orderBy: { name: "asc" },
      take: ITEMS_PER_PAGE,
      skip: ITEMS_PER_PAGE * (p - 1),
    }),
    prisma.parent.count({ where: query }),
  ]);

  const parentIds = parents.map((parent) => parent.id);
  const students = parentIds.length
    ? await prisma.student.findMany({
        where: { parentId: { in: parentIds } },
        select: { id: true, name: true, surname: true, parentId: true },
        orderBy: { name: "asc" },
      })
    : [];

  const studentsByParent = new Map<string, Student[]>();
  for (const student of students) {
    const list = studentsByParent.get(student.parentId) ?? [];
    list.push(student as Student);
    studentsByParent.set(student.parentId, list);
  }

  const data: ParentList[] = parents.map((parent) => ({
    ...parent,
    students: studentsByParent.get(parent.id) ?? [],
  }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainer table="parent" type="create" />}
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

export default ParentListPage;