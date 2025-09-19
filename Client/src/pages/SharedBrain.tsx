import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card } from "../components/Card";
import { ShareIcon, Globe, Clock, User } from "lucide-react";

interface Content {
    _id: string;
    type: "twitter" | "youtube" | "document" | "link";
    link: string;
    title: string;
    description?: string;
    tags: { _id: string; name: string }[];
    createdAt: string;
}

interface SharedBrainData {
    content: Content[];
    owner: string;
}

export default function SharedBrain() {
    const { shareLink } = useParams<{ shareLink: string }>();
    const [brainData, setBrainData] = useState<SharedBrainData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedBrain = async () => {
            try {
                setLoading(true);
                const response = await axios.get(
                    `http://localhost:9898/api/v1/brain/${shareLink}`,
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
                setBrainData(response.data.data);
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError("This shared brain doesn't exist or has been removed.");
                } else if (err.response?.status === 410) {
                    setError("This shared brain link has expired.");
                } else {
                    setError("Failed to load shared brain. Please try again later.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (shareLink) {
            fetchSharedBrain();
        }
    }, [shareLink]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading shared brain...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShareIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Oops! Something went wrong
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <ShareIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Shared Second Brain
                                </h1>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    <div className="flex items-center space-x-1">
                                        <Globe className="w-4 h-4" />
                                        <span>Public Collection</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <User className="w-4 h-4" />
                                        <span>Shared by User</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{brainData?.content.length || 0} items</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = "/"}
                            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                            Create Your Own Brain
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {brainData?.content && brainData.content.length > 0 ? (
                    <>
                        <div className="mb-6">
                            <p className="text-gray-600 dark:text-gray-400">
                                Exploring {brainData.content.length} curated items from this brain
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {brainData.content.map((content) => (
                                <Card
                                    key={content._id}
                                    _id={content._id}
                                    type={content.type}
                                    link={content.link}
                                    title={content.title}
                                    description={content.description}
                                    tags={content.tags}
                                    createdAt={content.createdAt}
                                    onDelete={() => {}} // No delete functionality for shared brains
                                    isShared={true} // New prop to indicate this is a shared view
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShareIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No content shared yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            This brain doesn't have any content to display at the moment.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
