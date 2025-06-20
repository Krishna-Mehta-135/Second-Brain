import React, {ReactElement} from "react";

type Variants = "Primary" | "Secondary";

interface ButtonProps {
    variant: Variants;
    size: "sm" | "md" | "lg";
    text: string;
    startIcon?: ReactElement;
    endIcon?: ReactElement;
    onClick?: () => void;
    className?: string;
}

const variantStyles = {
    Primary: "bg-purple-600 text-white",
    Secondary: "bg-purple-300 text-purple-500 ",
};

const defaultStyles = "rounded-md flex items-center";
const sizeStyles = {
    sm: "py-1 px-2",
    md: "py-2 px-4",
    lg: "py-4 px-6",
};

export const Button = ({variant, size, text, startIcon, endIcon, onClick, className}: ButtonProps) => {
    return (
        <button className={`${variantStyles[variant]} ${defaultStyles} ${sizeStyles[size]} ${className}`} onClick={onClick} >
            {startIcon ? <div className="pr-2">{startIcon}</div> : null}
            {text}
            {endIcon ? <div className="pl-2">{endIcon}</div> : null}
        </button>
    );
};
