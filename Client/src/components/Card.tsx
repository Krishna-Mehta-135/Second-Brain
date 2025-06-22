import React, {useState, useEffect} from "react";
import {TrashIcon} from "../Icons/TrashIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {ShareIcon} from "../Icons/ShareIcon";
import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";

interface CardProps {
    id?: string;
    title: string;
    link: string;
    type: "link" | "video" | "document" | "tweet" | "tag";
    tags?: Array<{_id: string; name: string}>;
    onDelete?: (id: string) => void;
}

export const Card = ({id, title, link, type, tags, onDelete}: CardProps) => {
    const [youtubeId, setYoutubeId] = useState<string | null>(null);
    const [tweetLink, setTweetLink] = useState<string>(link);

    useEffect(() => {
        if (type === "video") {
            const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = link.match(regex);
            if (match) setYoutubeId(match[1]);
        }

        if (type === "tweet") {
            let updatedLink = link;
            if (updatedLink.includes("x.com")) {
                updatedLink = updatedLink.replace("x.com", "twitter.com");
                setTweetLink(updatedLink);
            }

            const scriptLoaded = [...document.getElementsByTagName("script")].some((s) =>
                s.src.includes("platform.twitter.com/widgets.js")
            );

            if (!scriptLoaded) {
                const script = document.createElement("script");
                script.src = "https://platform.twitter.com/widgets.js";
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [link, type]);

    const renderIcon = () => {
        switch (type) {
            case "video":
                return <YoutubeIcon />;
            case "tweet":
                return <TwitterIcon />;
            case "document":
                return <DocumentIcon />;
            case "link":
                return <LinkIcon />;
            case "tag":
                return <TagIcon />;
        }
    };

    const showFallback = (!title || title.trim() === "") && type !== "tweet" && type !== "video";

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700 transition-colors duration-300 w-full h-full flex flex-col justify-between overflow-hidden z-0">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="text-gray-500 dark:text-gray-400">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                            {renderIcon()}
                        </a>
                    </div>
                    <span className="font-medium text-gray-800 dark:text-white break-all">
                        {title || <span className="italic text-gray-500">Untitled</span>}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
                        <ShareIcon />
                    </div>
                    {onDelete && id && (
                        <div className="text-gray-500 hover:text-red-500 cursor-pointer" onClick={() => onDelete(id)}>
                            <TrashIcon />
                        </div>
                    )}
                </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {tags.map((tag) => (
                        <span
                            key={tag._id}
                            className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-1 rounded"
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="mt-4 relative z-0 flex-1">
                {/* Fallback if content is missing */}
                {showFallback && (
                    <div className="flex justify-center items-center h-full opacity-30">{renderIcon()}</div>
                )}

                {type === "video" && youtubeId && (
                    <div className="w-full rounded overflow-hidden">
                        <iframe
                            className="w-full aspect-video"
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </div>
                )}

                {type === "tweet" && (
                    <blockquote className="twitter-tweet overflow-hidden relative z-0">
                        <a href={tweetLink}></a>
                    </blockquote>
                )}

                {type === "document" && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                        Open Document →
                    </a>
                )}

                {type === "link" && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                        Visit Link →
                    </a>
                )}

                {type === "tag" && (
                    <div className="bg-purple-50 dark:bg-purple-800 p-3 rounded mt-2">
                        <p className="text-purple-700 dark:text-purple-200 text-sm">
                            Related content with #{title} tag
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
