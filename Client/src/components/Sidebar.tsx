import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {SidebarItem} from "./SidebarItem";
import {Logo} from "../Icons/Logo";

export const Sidebar = () => {
    return (
        <div className="h-screen w-76 fixed top-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center text-2xl font-semibold p-6 text-black dark:text-white">
                <div className="pr-2 text-purple-600">
                    <Logo />
                </div>
                Second Brain
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-2 px-4">
                <SidebarItem text="Videos" icon={<YoutubeIcon />} />
                <SidebarItem text="Documents" icon={<DocumentIcon />} />
                <SidebarItem text="Links" icon={<LinkIcon />} />
                <SidebarItem text="Tags" icon={<TagIcon />} />
                <SidebarItem text="Twitter" icon={<TwitterIcon />} />
            </div>
        </div>
    );
};
