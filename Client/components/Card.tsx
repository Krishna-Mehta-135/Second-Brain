import React, { useState, useEffect } from "react";
import { TrashIcon } from "./../Icons/TrashIcon";
import { TwitterIcon } from "./../Icons/TwitterIcon";
import { YoutubeIcon } from "./../Icons/YoutubeIcon";
import { ShareIcon } from "./../Icons/ShareIcon";
import { DocumentIcon } from "./../Icons/DocumentIcon";
import { LinkIcon } from "./../Icons/LinkIcon";
import { TagIcon } from "./../Icons/TagIcon";

interface CardProps {
    id?: string;
    title: string;
    link: string;
    type: "link" | "video" | "document" | "tweet" | "tag";
    tags?: Array<{ _id: string; name: string }>;
    onDelete?: (id: string) => void;
}

export const Card = ({ id, title, link, type, tags, onDelete }: CardProps) => {
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

            const existingScript = Array.from(document.getElementsByTagName("script")).find(script =>
                script.src.includes("platform.twitter.com/widgets.js")
            );

            if (!existingScript) {
                const script = document.createElement("script");
                script.src = "https://platform.twitter.com/widgets.js";
                script.async = true;
                document.body.appendChild(script);
            }

            return () => {
                // Optional cleanup (not removing script to prevent reload issues)
            };
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

    return (
        <div>
            <div className="bg-white rounded-md p-4 max-w-72 border border-gray-300">
                <div className="flex justify-between">
                    <div className="flex items-center">
                        <div className="text-gray-500 pr-2">
                            <a href={link} target="_blank" rel="noopener noreferrer">
                                {renderIcon()}
                            </a>
                        </div>
                        <span className="font-medium">{title}</span>
                    </div>
                    <div className="flex items-center">
                        <div className="pr-2 text-gray-500 hover:text-purple-600 cursor-pointer">
                            <ShareIcon />
                        </div>
                        {onDelete && id && (
                            <div
                                className="pr-2 text-gray-500 hover:text-red-500 cursor-pointer"
                                onClick={() => onDelete(id)}
                            >
                                <TrashIcon />
                            </div>
                        )}
                    </div>
                </div>
                {/* <div className="p-4"></div> */}

                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((tag) => (
                            <span key={tag._id} className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-4">
                    {type === "video" && youtubeId && (
                        <iframe
                            className="w-full aspect-video"
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    )}

                    {type === "tweet" && (
                        <blockquote className="twitter-tweet">
                            <a href={tweetLink}></a>
                        </blockquote>
                    )}

                    {type === "document" && (
                        <div className="mt-2">
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                Open Document →
                            </a>
                        </div>
                    )}

                    {type === "link" && (
                        <div className="mt-2">
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                Visit Link →
                            </a>
                        </div>
                    )}

                    {type === "tag" && (
                        <div className="bg-purple-50 p-3 rounded mt-2">
                            <p className="text-purple-700 text-sm">Related content with #{title} tag</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
