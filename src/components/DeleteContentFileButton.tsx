"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { deleteContentFile } from "@/lib/actions";

const DeleteContentFileButton = ({ id }: { id: number }) => {
  const [state, formAction] = useActionState(deleteContentFile, {
    success: false,
    error: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("File deleted.");
      router.refresh();
    } else if (state.error) {
      toast.error("Couldn't delete that file.");
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" defaultValue={id} />
      <button
        type="submit"
        className="text-xs text-red-400 hover:underline"
        onClick={(e) => {
          if (!confirm("Delete this file? This can't be undone.")) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
};

export default DeleteContentFileButton;