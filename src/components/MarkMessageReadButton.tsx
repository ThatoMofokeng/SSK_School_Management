"use client";

import { markMessageRead } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Deliberately not built on useFormState/useActionState (see FormModal's
// delete flow for that pattern) — Server Actions are plain async
// functions, so calling one directly from a click handler works the
// same way and keeps this one small button dependency-free.
const MarkMessageReadButton = ({ id }: { id: number }) => {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setPending(true);
    const formData = new FormData();
    formData.set("id", id.toString());
    const result = await markMessageRead(
      { success: false, error: false },
      formData
    );
    setPending(false);
    if (result.success) {
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-xs text-blue-500 underline underline-offset-2 disabled:opacity-50"
    >
      Mark as read
    </button>
  );
};

export default MarkMessageReadButton;
