import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Link from "next/link";
import FormModal from "@/components/FormModal";
import { Teacher, Subject, Class, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { tr } from "zod/locales";
import { ITEMS_PER_PAGE } from "@/lib/setting";
//import { role } from "@/lib/utils";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";

const { userId, sessionClaims } =  await auth();
export const role = (sessionClaims?.metadata as { role?: string})?.role;
export const currentUserId = userId;


type TeacherList = Teacher & { subjects: Subject[] } & { classes: Class[] };


const columns = [
    {
        header: "Info",
        accessor: "info",
    },
    {
        header: "Teacher ID",
        accessor: "teacherId",
        className: "hidden md:table-cell",
    },
    {
        header: "Subjects",
        accessor: "subjects",
        className: "hidden md:table-cell",
    },
    {
        header: "Classes",
        accessor: "classes",
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
    ...(role === "admin" ? [
        {
            header: "Actions",
            accessor: "action",
    
        },
    ]
    : []),

]




{/* render information in the table, row info */ }
const renderRow = (item: TeacherList) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">

        <td className="flex items-center gap-4 p-4">
            <Image src={item.img || "/noAvatar.jpg"} alt="" width={40} height={40} className="md:hidden xl:block w-10 h-10 rounded-full object-cover" />

            <div className="flex flex-col">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-xs text-gray-500">{item?.email}</p>
            </div>
        </td>

        <td className="hidden md:table-cell p-4">{item.username}</td>
        <td className="hidden md:table-cell p-4">{item.subjects.map(subject => subject.name).join(", ")}</td>
        <td className="hidden md:table-cell p-4">{item.classes.map(classItem => classItem.name).join(", ")}</td>
        <td className="hidden lg:table-cell p-4">{item.phone}</td>
        <td className="hidden lg:table-cell p-4">{item.address}</td>

        {/* Actions */}
        <td className="p-4">
            <div className="flex items-center gap-2">
                <Link href={`/list/teachers/${item.id}`}>
                    <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
                        <Image src="/view.png" alt="" width={16} height={16} />
                    </button>
                </Link>

                {role === "admin" && (
                    //<button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
                    //  <Image src="/delete.png" alt="" width={16} height={16} />
                    //</button>
                    <FormContainer table="teacher" type="delete" id={item.id} />
                )}
            </div>
        </td>


    </tr>

);


const TeachersListPage = async ({
    searchParams,
}: {
    searchParams: { [key: string]: string | undefined };
}) => {

    const { page, ...queryParams } = searchParams;

    const p = page ? parseInt(page) : 1;

    //URL PARAMS CONDITIONS
    const query: Prisma.TeacherWhereInput = {};

    if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined) {
                switch (key) {
                    case "classId": query.lessons = {
                        some: {
                            classId: parseInt(value),
                        },
                    };
                        break;
                    case "search":
                        query.name = { contains: value, mode: "insensitive" };
                        break;
                    default: break;
                }

            }
        }
    }

    const [data, count] = await prisma.$transaction([

        prisma.teacher.findMany({
            where: query,
            include: {
                subjects: true,
                classes: true,
            },
            take: ITEMS_PER_PAGE,
            skip: ITEMS_PER_PAGE * (p - 1),
        }),
        prisma.teacher.count({ where: query }),
    ]);





    return (
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

            {/* TOP */}
            <div className="flex items-center justify-between">
                <h1 className="hidden md:block text-lg font-semibold">All Teachers</h1>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <TableSearch />

                    <div className="flex items-center gap-4 self-end">
                        {/* filter button */}
                        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                            <Image src="/filter.png" alt="" width={14} height={14} />
                        </button>

                        {/* sort button */}
                        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                            <Image src="/sort.png" alt="" width={14} height={14} />
                        </button>

                        {/* plus button */}
                        {role === "admin" && (
                            //<button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                            //<Image src="/plus.png" alt="" width={14} height={14} />
                            //</button>)}
                            <FormContainer table="teacher" type="create" />
                        )}</div>

                </div>
            </div>

            {/* LIST */}
            <Table columns={columns} renderRow={renderRow} data={data} />

            {/* PAGINATION */}

            <Pagination page={p} count={count} />

        </div>
    )
}

export default TeachersListPage;
