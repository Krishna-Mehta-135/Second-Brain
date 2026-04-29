import { ReactElement } from "react";

interface SidebarItemProps {
    text: string;
    icon: ReactElement;
    isActive?: boolean;
    onClick?: () => void;
}

export const SidebarItem = ({ text, icon, isActive = false, onClick }: SidebarItemProps) => {
    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer 
                transition-all duration-200 group
                ${isActive 
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700/50 hover:text-purple-600 dark:hover:text-purple-400'
                }
            `}
            onClick={onClick}
        >
            <div className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
                {icon}
            </div>
            <div className={`text-base font-medium ${isActive ? 'text-white' : ''}`}>
                {text}
            </div>
            {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-80"></div>
            )}
        </div>
    );
};
