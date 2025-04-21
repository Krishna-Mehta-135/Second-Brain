import { ReactElement } from 'react';

type Variants = "Primary" | "Secondary"

interface ButtonProps {
    variant : Variants;
    size : "sm" | "md" | "lg";
    text : string;
    startIcon ?: ReactElement;
    endIcon ?: ReactElement;
    onClick : () => void;
}

const variantStyles = {
    // "Primary" : 
}