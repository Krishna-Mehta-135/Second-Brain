import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface ToastProps {
    message: string;
    type?: "success" | "error" | "info";
    duration?: number;
    onClose?: () => void;
}

export const Toast = ({ message, type = "success", duration = 4000, onClose }: ToastProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
    };

    const getToastStyles = () => {
        switch (type) {
            case "success":
                return "bg-green-500 text-white";
            case "error":
                return "bg-red-500 text-white";
            case "info":
                return "bg-blue-500 text-white";
            default:
                return "bg-green-500 text-white";
        }
    };

    const getIcon = () => {
        switch (type) {
            case "success":
                return <CheckCircle className="h-5 w-5" />;
            case "error":
                return <X className="h-5 w-5" />;
            case "info":
                return <CheckCircle className="h-5 w-5" />;
            default:
                return <CheckCircle className="h-5 w-5" />;
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className={`
                fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg
                flex items-center gap-3 transition-all duration-300 transform
                ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
                ${getToastStyles()}
            `}
        >
            {getIcon()}
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
                onClick={handleClose}
                className="text-white/80 hover:text-white p-1 rounded transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};
