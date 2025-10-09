import { FieldError } from "react-hook-form";

type InputFieldProps = {
    label: string;
    type?: string;
    register: any;
    name: string;
    defaultValue?: string;
    error?: FieldError;
    hidden?: boolean;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>
    

};

const InputField = ({
    label,
    type = "text",
    register,
    name,
    defaultValue,
    error,
    hidden,
    inputProps,
    
}: InputFieldProps) => {
    return (
        <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
            <label className="text-sm text-gray-500">{label}</label>

            <input type="text" {...register(name)} className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...inputProps} defaultValue={defaultValue} />

            {error?.message && <p className="text-red-400 text-sm">{error.message.toString()}</p>}

        </div>
    );
};

export default InputField;