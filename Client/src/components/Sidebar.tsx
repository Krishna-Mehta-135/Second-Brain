import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {SidebarItem} from "./SidebarItem";
import {Logo} from "../Icons/Logo";

export const Sidebar = () => {
    return (
        <aside className="h-screen w-64 sm:w-76 fixed top-0 left-0 z-40 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center text-2xl font-semibold p-6 text-black dark:text-white">
                <div className="pr-2 text-purple-600">
                    <Logo />
                </div>
                Second Brain
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 px-4">
                <SidebarItem text="Videos" icon={<YoutubeIcon />} />
                <SidebarItem text="Documents" icon={<DocumentIcon />} />
                <SidebarItem text="Links" icon={<LinkIcon />} />
                <SidebarItem text="Tags" icon={<TagIcon />} />
                <SidebarItem text="Twitter" icon={<TwitterIcon />} />
            </nav>
        </aside>
    );
};
