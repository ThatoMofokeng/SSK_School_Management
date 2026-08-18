"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { messageSchema, MessageSchema } from "@/lib/formValidationSchemas";
import { createMessage } from "@/lib/actions";
import { Dispatch, SetStateAction, startTransition, useActionState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  const [state, formAction] = useActionState(createMessage, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
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
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold text-gray-800">
        {type === "create" ? "New Message" : "Message"}
      </h1>

      <div className="flex flex-col gap-2 w-full border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-10 shrink-0">To:</label>
          <div className="flex items-center gap-2 flex-1 ring-[1.5px] ring-gray-300 rounded-md px-2">
            <Image src="/search.png" alt="" width={14} height={14} className="opacity-60" />
            <select
              className="flex-1 p-2 bg-transparent text-sm outline-none"
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
                Enter a course member or group
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
          </div>
        </div>
        <input type="hidden" {...register("receiverRole")} />
        {(errors.receiverId?.message || errors.receiverRole?.message) && (
          <p className="text-xs text-red-400 ml-[3.25rem]">
            {(errors.receiverId?.message ?? errors.receiverRole?.message)?.toString()}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs text-gray-500">Subject</label>
        <input
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          placeholder="Subject"
          {...register("subject")}
        />
        {errors.subject?.message && (
          <p className="text-xs text-red-400">{errors.subject.message.toString()}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <textarea
          rows={7}
          placeholder="Type a message"
          className="ring-[1.5px] ring-gray-300 p-3 rounded-md text-sm w-full resize-none"
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
      <button className="self-end bg-lamaSky text-gray-700 font-medium px-5 py-2 rounded-full flex items-center gap-2 hover:opacity-90">
        <Image src="/mail.png" alt="" width={14} height={14} />
        Send
      </button>
    </form>
  );
};

export default MessageForm;