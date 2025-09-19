import {useState, useEffect} from "react";
import {TrashIcon} from "../Icons/TrashIcon";
import {TwitterIcon} from "../Icons/TwitterIcon";
import {YoutubeIcon} from "../Icons/YoutubeIcon";
import {ShareIcon} from "../Icons/ShareIcon";
import {DocumentIcon} from "../Icons/DocumentIcon";
import {LinkIcon} from "../Icons/LinkIcon";
import {TagIcon} from "../Icons/TagIcon";

// Twitter widgets type declaration
declare global {
    interface Window {
        twttr?: {
            widgets: {
                load: () => void;
            };
        };
    }
}

interface CardProps {
    _id?: string;
    id?: string;
    title: string;
    link: string;
    type: "link" | "video" | "document" | "tweet" | "tag" | "twitter" | "youtube";
    tags?: Array<{_id: string; name: string}>;
    description?: string;
    createdAt?: string;
    onDelete?: (id: string) => void;
    isShared?: boolean;
}

export const Card = ({_id, id, title, link, type, tags, description, createdAt, onDelete, isShared = false}: CardProps) => {
    const cardId = _id || id;
    
    // Map backend types to frontend types
    const normalizedType = type === "twitter" ? "tweet" : type === "youtube" ? "video" : type;
    
    const [youtubeId, setYoutubeId] = useState<string | null>(null);
    const [tweetLink, setTweetLink] = useState<string>(link);

    useEffect(() => {
        if (normalizedType === "video" || type === "youtube") {
            const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = link.match(regex);
            if (match) setYoutubeId(match[1]);
        }

        if (normalizedType === "tweet" || type === "twitter") {
            let updatedLink = link;
            if (updatedLink.includes("x.com")) {
                updatedLink = updatedLink.replace("x.com", "twitter.com");
                setTweetLink(updatedLink);
            }

            // Load Twitter widgets script
            const loadTwitterWidgets = () => {
                const existingScript = Array.from(document.getElementsByTagName("script")).find((script) =>
                    script.src.includes("platform.twitter.com/widgets.js")
                );

                if (!existingScript) {
                    const script = document.createElement("script");
                    script.src = "https://platform.twitter.com/widgets.js";
                    script.async = true;
                    script.onload = () => {
                        // Force widget creation after script loads
                        setTimeout(() => {
                            if (window.twttr && window.twttr.widgets) {
                                window.twttr.widgets.load();
                            }
                        }, 100);
                    };
                    document.body.appendChild(script);
                } else {
                    // Script already exists, just reload widgets
                    setTimeout(() => {
                        if (window.twttr && window.twttr.widgets) {
                            window.twttr.widgets.load();
                        }
                    }, 100);
                }
            };

            loadTwitterWidgets();
        }
    }, [link, type]);

    const renderIcon = () => {
        switch (normalizedType) {
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
            default:
                return <LinkIcon />;
        }
    };

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] w-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                            {renderIcon()}
                        </a>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm leading-tight line-clamp-2">
                        {title}
                    </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer p-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <ShareIcon />
                    </div>
                    {!isShared && onDelete && cardId && (
                        <div className="text-gray-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => onDelete(cardId)}>
                            <TrashIcon />
                        </div>
                    )}
                </div>
            </div>

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

            <div className="space-y-4">
                {(normalizedType === "video" || type === "youtube") && youtubeId && (
                    <div className="w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
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

                {(normalizedType === "tweet" || type === "twitter") && (
                    <div className="w-full max-w-full overflow-hidden">
                        <blockquote 
                            className="twitter-tweet" 
                            data-theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            data-width="100%"
                            data-dnt="true"
                        >
                            <a href={tweetLink}></a>
                        </blockquote>
                    </div>
                )}

                {normalizedType === "document" && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            <DocumentIcon />
                            Open Document →
                        </a>
                    </div>
                )}

                {normalizedType === "link" && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            <LinkIcon />
                            Visit Link →
                        </a>
                    </div>
                )}

                {type === "tag" && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                            <TagIcon />
                            <p className="text-sm font-medium">
                                Related content with #{title} tag
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
