import {ReactElement} from "react";

interface SidebarItemProps {
    text: string;
    icon: ReactElement;
    onClick?: () => void;
}

export const SidebarItem = ({text, icon, onClick}: SidebarItemProps) => {
    return (
        <div
            onClick={onClick}
            className="
        flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
        text-black dark:text-white 
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors duration-200"
        >
            <div className="text-xl">{icon}</div>
            <div className="text-base font-medium">{text}</div>
        </div>
    );
};
