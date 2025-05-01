import React ,{ReactElement} from "react";

type Variants = "Primary" | "Secondary";

interface ButtonProps {
    variant: Variants;
    size: "sm" | "md" | "lg";
    text: string;
    startIcon?: ReactElement;
    endIcon?: ReactElement;
    onClick: () => void;
}

const variantStyles = {
    Primary: "bg-purple-600 text-white",
    Secondary: "bg-purple-300 text-purple-500",
};

const defaultStyles = "rounded-md flex items-center";
const sizeStyles = {
    sm: "py-1 px-2",
    md: "py-2 px-4",
    lg: "py-4 px-6",
};

export const Button = (props: ButtonProps) => {
    return (
        <button className={` ${variantStyles[props.variant]} ${defaultStyles} ${sizeStyles[props.size]}`}>
            {props.startIcon ? <div className="pr-2">{props.startIcon}</div> : null}
            {props.text}
            {props.endIcon ? <div className="pl-2">{props.endIcon}</div> : null}
        </button>
    );
};
