import { ReactElement } from "react";

export const SidebarItem = ({ text, icon }: { text: string; icon: ReactElement }) => {
    return (
        <div
            className="
                flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer 
                text-black dark:text-white 
                hover:bg-transparent hover:underline dark:hover:bg-gray-700 
                transition-colors duration-200"
        >
            <div className="text-xl">{icon}</div>
            <div className="text-base font-medium">{text}</div>
        </div>
    );
};
