"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createContentFile } from "@/lib/actions";

// Same restriction as assignment attachments - Cloudinary's unsigned
// "school" preset needs "Auto" or "Raw" resource type enabled, and
// these extensions added to its allowed formats list, in the
// Cloudinary dashboard. That can't be configured from code.
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

const ContentUploadButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
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

        startTransition(async () => {
          const res = await createContentFile(
            { success: false, error: false },
            {
              fileName: `${info.original_filename}.${info.format}`,
              fileUrl: info.secure_url,
              fileType: info.format,
              fileSize: info.bytes,
            }
          );
          if (res.success) {
            router.refresh();
          } else {
            toast.error("Couldn't save that file. Please try again.");
          }
        });
      }}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => open()}
          disabled={isPending}
          className="bg-lamaYellow text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Upload"}
        </button>
      )}
    </CldUploadWidget>
  );
};

export default ContentUploadButton;