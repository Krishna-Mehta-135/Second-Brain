import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {SidebarItem} from "./SidebarItem";
import {Brain, Home} from "lucide-react";

interface SidebarProps {
    activeFilter?: string;
    setActiveFilter?: (filter: string) => void;
}

export const Sidebar = ({ activeFilter = "all", setActiveFilter }: SidebarProps) => {
    const menuItems = [
        { id: "all", text: "All Content", icon: <Home className="h-5 w-5" /> },
        { id: "video", text: "Videos", icon: <YoutubeIcon /> },
        { id: "document", text: "Documents", icon: <DocumentIcon /> },
        { id: "link", text: "Links", icon: <LinkIcon /> },
        { id: "tweet", text: "Tweets", icon: <TwitterIcon /> },
        { id: "tags", text: "Tags", icon: <TagIcon /> },
    ];

    return (
        <div className="h-screen w-76 fixed top-0 left-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center text-2xl font-semibold p-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl mr-3">
                    <Brain className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Second Brain
                </span>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-1 px-4">
                {menuItems.map((item) => (
                    <SidebarItem
                        key={item.id}
                        text={item.text}
                        icon={item.icon}
                        isActive={activeFilter === item.id}
                        onClick={() => setActiveFilter?.(item.id)}
                    />
                ))}
            </div>
        </div>
    );
};
