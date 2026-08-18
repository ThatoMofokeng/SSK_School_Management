"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { messageSchema, MessageSchema } from "@/lib/formValidationSchemas";
import { createMessage } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type RecipientRole = "admin" | "teacher" | "student" | "parent";

type Recipient = {
  id: string;
  role: RecipientRole;
  label: string;
};

const roleLabels: Record<RecipientRole, string> = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students",
  parent: "Parents",
};

const MessageForm = ({
  type,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MessageSchema>({
    resolver: zodResolver(messageSchema),
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE
  const [state, formAction] = useFormState(createMessage, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    formAction(formData);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Message sent!");
      setOpen(false);
      router.refresh();
    }
  }, [state, router, setOpen]);

  const recipients: Recipient[] = useMemo(
    () => relatedData?.recipients ?? [],
    [relatedData]
  );

  const groupedRecipients = useMemo(
    () =>
      (["admin", "teacher", "student", "parent"] as RecipientRole[])
        .map((role) => ({
          role,
          people: recipients.filter((r) => r.role === role),
        }))
        .filter((group) => group.people.length > 0),
    [recipients]
  );

  const receiverIdField = register("receiverId");

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "New message" : "Message"}
      </h1>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs text-gray-500">To</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          defaultValue=""
          {...receiverIdField}
          onChange={(e) => {
            receiverIdField.onChange(e);
            const chosen = recipients.find((r) => r.id === e.target.value);
            setValue("receiverRole", chosen?.role as MessageSchema["receiverRole"], {
              shouldValidate: true,
            });
          }}
        >
          <option value="" disabled>
            Choose a recipient...
          </option>
          {groupedRecipients.map(({ role, people }) => (
            <optgroup key={role} label={roleLabels[role]}>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input type="hidden" {...register("receiverRole")} />
        {(errors.receiverId?.message || errors.receiverRole?.message) && (
          <p className="text-xs text-red-400">
            {(errors.receiverId?.message ?? errors.receiverRole?.message)?.toString()}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs text-gray-500">Subject</label>
        <input
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("subject")}
        />
        {errors.subject?.message && (
          <p className="text-xs text-red-400">{errors.subject.message.toString()}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs text-gray-500">Message</label>
        <textarea
          rows={5}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("content")}
        />
        {errors.content?.message && (
          <p className="text-xs text-red-400">{errors.content.message.toString()}</p>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">
          {state.message || "Something went wrong!"}
        </span>
      )}
      <button className="bg-blue-400 text-white p-2 rounded-md">Send</button>
    </form>
  );
};

export default MessageForm;
