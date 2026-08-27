"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, startTransition, useActionState, useEffect } from "react";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const ParentForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      idType: data?.idType,
      idNumber: data?.idNumber,
    },
  });

  const idType = watch("idType");

  const [state, formAction, isPending] = useActionState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Parent has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new parent" : "Update the parent"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
          inputProps={type === "create" ? { required: true, minLength: 8 } : {}}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="First Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Identification
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">ID Type</label>
          <div className="flex items-center gap-4 h-[42px]">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="SA_ID"
                {...register("idType")}
              />
              South African ID
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="PASSPORT"
                {...register("idType")}
              />
              Passport
            </label>
          </div>
          {errors.idType?.message && (
            <p className="text-xs text-red-400">
              {errors.idType.message.toString()}
            </p>
          )}
        </div>

        <InputField
          label={
            idType === "PASSPORT" ? "Passport Number" : "South African ID Number"
          }
          name="idNumber"
          defaultValue={data?.idNumber}
          register={register}
          error={errors?.idNumber}
          inputProps={
            idType === "SA_ID" ? { maxLength: 13, inputMode: "numeric" } : {}
          }
        />
      </div>

      {state.error && (
        <span className="text-red-500">
          {(state as any).message ||
            "Something went wrong! If you're trying to delete this parent, make sure no learners are still linked to them first."}
        </span>
      )}
      <button
        type="submit"
        disabled={state.success || isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ParentForm;