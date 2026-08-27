"use client";

import {
  deleteAnnouncement,
  deleteAssignment,
  deleteAttendance,
  deleteClass,
  deleteEvent,
  deleteExam,
  deleteLesson,
  deleteMessage,
  deleteParent,
  deleteResult,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
} from "@/lib/actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useActionState, useEffect, useState } from "react";
//import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";

const deleteActionMap: {
  [key: string]: (
    currentState: { success: boolean; error: boolean },
    formData: FormData
  ) => Promise<{ success: boolean; error: boolean }>;
} = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  exam: deleteExam,
  message: deleteMessage,
  announcement: deleteAnnouncement,
  parent: deleteParent,
  lesson: deleteLesson,
  assignment: deleteAssignment,
  result: deleteResult,
  attendance: deleteAttendance,
  event: deleteEvent,
};

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";

const TeacherForm = dynamic(() => import("./Forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./Forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./Forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./Forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./Forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const MessageForm = dynamic(() => import("./Forms/MessageForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./Forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AttendanceForm = dynamic(() => import("./Forms/AttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./Forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./Forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ParentForm = dynamic(() => import("./Forms/Parentform"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./Forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./Forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
// TODO: OTHER FORMS

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
    // TODO OTHER LIST ITEMS
  ),
  message: (setOpen, type, data, relatedData) => (
    <MessageForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  result: (setOpen, type, data, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    const [state, formAction] = useActionState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`${table} has been deleted!`);
        setOpen(false);
        router.refresh();
      } else if (state.error) {
        toast.error(`Couldn't delete this ${table}. It may not be available yet.`);
      }
    }, [state, router, table]);

    return type === "delete" && id ? (
      <form action={formAction} className="p-4 flex flex-col gap-4">
        <input type="text" name="id" defaultValue={id} hidden />
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      forms[table] ? (
        forms[table](setOpen, type, data, relatedData)
      ) : (
        <div className="p-6 text-center text-sm text-gray-500">
          {table.charAt(0).toUpperCase() + table.slice(1)} management isn&apos;t
          available yet.
        </div>
      )
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      {table === "message" && type === "create" ? (
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-lamaSky text-sm font-medium text-gray-700 hover:opacity-90"
          onClick={() => setOpen(true)}
        >
          <Image src="/mail.png" alt="" width={16} height={16} />
          New Message
        </button>
      ) : (
        <button
          className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
          onClick={() => setOpen(true)}
        >
          <Image src={`/${type}.png`} alt="" width={16} height={16} />
        </button>
      )}
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;