import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {motion} from "framer-motion";
import {Brain, Search, LogOut} from "lucide-react";

import {Card} from "../components/Card";
import {Button} from "../components/Button";
import {PlusIcon} from "../Icons/PlusIcon";
import {ShareIcon} from "../Icons/ShareIcon";
import {CreateContentModal} from "../components/CreateContentModal";
import {Sidebar} from "../components/Sidebar";
import {Toast} from "../components/Toast";
import {toggleDarkMode, initTheme} from "../utils/theme";

interface ContentItem {
    _id: string;
    title: string;
    link: string;
    type: "link" | "video" | "document" | "tweet" | "tag";
    tags?: Array<{_id: string; name: string}>;
}

function Dashboard() {
    const [modalOpen, setModalOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [search, setSearch] = useState("");
    const [content, setContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [shareLoading, setShareLoading] = useState(false);
    const [toast, setToast] = useState<{message: string; type: "success" | "error"} | null>(null);
    const navigate = useNavigate();

    const fetchContent = async () => {
        try {
            const res = await axios.get("http://localhost:9898/api/v1/content", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });

            const data = Array.isArray(res.data.data) ? res.data.data : [];
            setContent(data);
        } catch (err) {
            console.error("❌ Failed to load content:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initTheme();
        setIsDarkMode(document.documentElement.classList.contains("dark"));
        fetchContent();
    }, []);

    const handleToggleTheme = () => {
        toggleDarkMode();
        setIsDarkMode(!isDarkMode);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    const handleShareBrain = async () => {
        setShareLoading(true);
        try {
            const res = await axios.post("http://localhost:9898/api/v1/brain/share", {
                isPublic: true
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });

            const shareUrl = res.data.data.shareUrl;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(shareUrl);
            
            // Show success message
            setToast({
                message: `Share link copied to clipboard! ${shareUrl}`,
                type: "success"
            });
            
        } catch (err) {
            console.error("❌ Failed to share brain:", err);
            setToast({
                message: "Failed to create share link. Please try again.",
                type: "error"
            });
        } finally {
            setShareLoading(false);
        }
    };

    const handleDeleteContent = async (id: string) => {
        try {
            await axios.delete(`http://localhost:9898/api/v1/content/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });

            // Update the content list by removing the deleted item
            setContent(content.filter(item => item._id !== id));
            
            setToast({
                message: "Content deleted successfully!",
                type: "success"
            });
        } catch (err) {
            console.error("❌ Failed to delete content:", err);
            setToast({
                message: "Failed to delete content. Please try again.",
                type: "error"
            });
        }
    };

    const filteredContent = content.filter((item) => {
        const lowerSearch = search.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(lowerSearch);
        const tagMatch = item.tags?.some((tag) => tag.name.toLowerCase().includes(lowerSearch));
        
        // Apply type filter
        const typeMatch = activeFilter === "all" || item.type === activeFilter;
        
        return (titleMatch || tagMatch) && typeMatch;
    });

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800 transition-all duration-500">
            <Sidebar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

            <main className="ml-76 w-full p-8 flex flex-col min-h-screen">
                <CreateContentModal onContentAdded={fetchContent} open={modalOpen} onClose={() => setModalOpen(false)} />

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Your Second Brain
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {content.length} items saved • {filteredContent.length} showing
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            variant="Secondary"
                            text={isDarkMode ? "☀️" : "🌙"}
                            size="md"
                            onClick={handleToggleTheme}
                        />
                        <Button
                            variant="Secondary"
                            text={shareLoading ? "Sharing..." : "Share Brain"}
                            startIcon={<ShareIcon />}
                            size="md"
                            onClick={handleShareBrain}
                        />
                        <Button
                            variant="Primary"
                            text="Add Content"
                            startIcon={<PlusIcon />}
                            size="md"
                            onClick={() => setModalOpen(true)}
                        />
                        <Button 
                            variant="Secondary" 
                            text="Logout" 
                            size="md" 
                            onClick={handleLogout}
                            startIcon={<LogOut className="h-4 w-4" />}
                        />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your content by title or tag..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-300">Loading your content...</p>
                            </div>
                        </div>
                    ) : content.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-20">
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-6">
                                <Brain className="h-12 w-12 text-white" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Your brain is empty</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                                Start building your second brain by saving articles, videos, tweets, and other valuable content.
                            </p>
                            <Button
                                variant="Primary"
                                text="Add your first content"
                                startIcon={<PlusIcon />}
                                size="lg"
                                onClick={() => setModalOpen(true)}
                            />
                        </div>
                    ) : filteredContent.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No results found</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                No content matches your search for "<strong>{search}</strong>" or the selected filter.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredContent.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{delay: index * 0.05, duration: 0.3}}
                                    className="group"
                                >
                                    <Card
                                        id={item._id}
                                        {...item}
                                        tags={item.tags?.map((tag: any) =>
                                            typeof tag === "string" ? {_id: tag, name: tag} : tag
                                        )}
                                        onDelete={handleDeleteContent}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default Dashboard;
