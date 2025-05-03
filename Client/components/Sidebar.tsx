import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {SidebarItem} from "./SidebarItem";
import {Logo} from "./../Icons/Logo";

export const Sidebar = () => {
    return (
        <div className="h-screen bg-white top-0 left-0 fixed w-76 border-r">
            <div className="flex text-2xl font-semibold p-6">
                <div className="pr-2 text-purple-600">
                    <Logo />
                </div>
                Second Brain
            </div>

            <div className="pt-3 p-8 ">
                <SidebarItem text={"Videos"} icon={<YoutubeIcon />} />
                <SidebarItem text={"Documents"} icon={<DocumentIcon />} />
                <SidebarItem text={"Links"} icon={<LinkIcon />} />
                <SidebarItem text={"Tags"} icon={<TagIcon />} />
                <SidebarItem text={"Twitter"} icon={<TwitterIcon />} />
            </div>
        </div>
    );
};
