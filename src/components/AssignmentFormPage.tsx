"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AssignmentForm from "@/components/Forms/AssignmentForm";

const AssignmentFormPage = ({
  type,
  data,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  relatedData: any;
}) => {
  // AssignmentForm was built to live inside a modal and calls
  // setOpen(false) on success to close it. Reusing it here as a full
  // page: give it a boolean it can still "close", and when it does,
  // navigate back to the list instead of hiding a modal.
  const [open, setOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      router.push("/list/assignments");
    }
  }, [open, router]);

  return (
    <div className="bg-white p-4 md:p-8 rounded-md flex-1 m-4 mt-0 max-w-3xl">
      <AssignmentForm
        type={type}
        data={data}
        setOpen={setOpen}
        relatedData={relatedData}
      />
    </div>
  );
};

export default AssignmentFormPage;
