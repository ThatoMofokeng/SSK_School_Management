"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError, useForm } from "react-hook-form";
import InputField from "../InputField";
import { assignmentSchema, AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";

type Attachment = {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
};

// Cloudinary's unsigned preset ("school") needs "Auto" or "Raw" resource
// type enabled, and these extensions added to its allowed formats list,
// in the Cloudinary dashboard - this can't be configured from code.
const ALLOWED_FORMATS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
];

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const AssignmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  // Optional now: the modal still passes this in (see FormModal.tsx),
  // but the new full-page routes below (list/assignments/new,
  // list/assignments/[id]/edit) render this form directly on the page,
  // with no modal to close — see the redirect in onSubmit's effect below.
  setOpen?: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title,
      description: data?.description || "",
      startDate: data?.startDate
        ? new Date(data.startDate).toISOString().slice(0, 10)
        : undefined,
      dueDate: data?.dueDate
        ? new Date(data.dueDate).toISOString().slice(0, 10)
        : undefined,
      lessonId: data?.lessonId,
    },
  });

  const [attachments, setAttachments] = useState<Attachment[]>(
    (data?.attachments || []).map((a: Attachment) => ({
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      fileSize: a.fileSize,
    }))
  );

  const removeAttachment = (fileUrl: string) => {
    setAttachments((prev) => prev.filter((a) => a.fileUrl !== fileUrl));
  };

  const [state, formAction] = useActionState(
    type === "create" ? createAssignment : updateAssignment,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction({ ...formData, attachments });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
      if (setOpen) {
        // Modal context (old call sites, if any remain).
        setOpen(false);
        router.refresh();
      } else {
        // Full-page context (list/assignments/new, .../[id]/edit) — there's
        // no modal to close, so go back to the list instead.
        router.push("/list/assignments");
        router.refresh();
      }
    }
  }, [state, router, type, setOpen]);

  const { lessons, contentFiles } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new assignment" : "Update the assignment"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Assignment title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Start Date"
          name="startDate"
          defaultValue={
            data?.startDate
              ? new Date(data.startDate).toISOString().slice(0, 10)
              : undefined
          }
          register={register}
          error={errors?.startDate}
          type="date"
        />
        <InputField
          label="Due Date"
          name="dueDate"
          defaultValue={
            data?.dueDate
              ? new Date(data.dueDate).toISOString().slice(0, 10)
              : undefined
          }
          register={register}
          error={errors?.dueDate}
          type="date"
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id as FieldError | undefined}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId")}
            defaultValue={data?.lessonId}
            disabled={lessons.length === 0}
          >
            <option value="">Select a lesson...</option>
            {lessons.map((lesson: { id: number; name: string }) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
          {lessons.length === 0 && (
            <p className="text-xs text-red-400">
              No lessons are assigned to you yet. Ask an admin to assign you
              a lesson before creating an assignment.
            </p>
          )}
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">
              {errors.lessonId.message.toString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">
          Instructions / description
        </label>
        <textarea
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full min-h-[120px]"
          placeholder="Write the assignment instructions here..."
          {...register("description")}
          defaultValue={data?.description || ""}
        />
        {errors.description?.message && (
          <p className="text-xs text-red-400">
            {errors.description.message.toString()}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">Attachments</label>

        {attachments.length > 0 && (
          <ul className="flex flex-col gap-1">
            {attachments.map((a) => (
              <li
                key={a.fileUrl}
                className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2"
              >
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lamaSky hover:underline truncate"
                >
                  {a.fileName}
                </a>
                <div className="flex items-center gap-3 shrink-0 pl-3">
                  <span className="text-xs text-gray-400">
                    {formatBytes(a.fileSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.fileUrl)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <CldUploadWidget
          uploadPreset="school"
          options={{
            multiple: true,
            maxFiles: 10,
            resourceType: "auto",
            clientAllowedFormats: ALLOWED_FORMATS,
          }}
          onSuccess={(result) => {
            const info = result.info;
            if (!info || typeof info === "string") return;
            setAttachments((prev) => [
              ...prev,
              {
                fileName: `${info.original_filename}.${info.format}`,
                fileUrl: info.secure_url,
                fileType: info.format,
                fileSize: info.bytes,
              },
            ]);
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              className="text-xs text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-md px-3 py-2 w-max hover:bg-gray-50"
            >
              Upload PDF, Word, Excel, PowerPoint, or ZIP
            </button>
          )}
        </CldUploadWidget>

        {contentFiles.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-gray-500">
              Or attach from your{" "}
              <a
                href="/list/content"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lamaSky hover:underline"
              >
                Content Collection
              </a>
              :
            </p>
            <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto border border-gray-100 rounded-md">
              {contentFiles.map((f: Attachment) => {
                const alreadyAdded = attachments.some(
                  (a) => a.fileUrl === f.fileUrl
                );
                return (
                  <li
                    key={f.fileUrl}
                    className="flex items-center justify-between text-xs px-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="truncate">{f.fileName}</span>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() =>
                        setAttachments((prev) => [...prev, f])
                      }
                      className="text-lamaSky hover:underline shrink-0 pl-3 disabled:text-gray-300 disabled:no-underline"
                    >
                      {alreadyAdded ? "Added" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={lessons.length === 0}
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AssignmentForm;