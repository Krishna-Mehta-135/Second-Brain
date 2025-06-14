import React from "react";
import {ReactElement} from "react";

export const SidebarItem = ({text, icon}: {text: string; icon: ReactElement}) => {
    return (
        <div className="flex cursor-pointer hover:underline">
            <div className="p-2">{icon}</div>
            <div className="p-2">{text}</div>
        </div>
    );
};
