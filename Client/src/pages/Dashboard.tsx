import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {motion} from "framer-motion";

import {Card} from "../components/Card";
import {Button} from "../components/Button";
import {PlusIcon} from "../Icons/PlusIcon";
import {ShareIcon} from "../Icons/ShareIcon";
import {CreateContentModal} from "../components/CreateContentModal";
import {Sidebar} from "../components/Sidebar";
import {toggleDarkMode, initTheme} from "../utils/theme";

interface ContentItem {
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
    const navigate = useNavigate();

    const fetchContent = async () => {
        try {
            const res = await axios.get("http://localhost:9898/api/v1/content", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
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

    const filteredContent = content.filter((item) => {
        const lowerSearch = search.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(lowerSearch);
        const tagMatch = item.tags?.some((tag) => tag.name.toLowerCase().includes(lowerSearch));
        return titleMatch || tagMatch;
    });

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300">
            <Sidebar />

            <main className="ml-76 w-full p-6 flex flex-col min-h-screen">
                <CreateContentModal onContentAdded={fetchContent} open={modalOpen} onClose={() => setModalOpen(false)} />

                {/* Header: Search + Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or tag..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="Secondary"
                            text={isDarkMode ? "☀️" : "🌙"}
                            size="md"
                            onClick={handleToggleTheme}
                        />
                        <Button
                            variant="Secondary"
                            text="Share Brain"
                            startIcon={<ShareIcon />}
                            size="md"
                            onClick={() => {}}
                        />
                        <Button
                            variant="Primary"
                            text="Add Content"
                            startIcon={<PlusIcon />}
                            size="md"
                            onClick={() => setModalOpen(true)}
                        />
                        <Button variant="Secondary" text="Logout" size="md" onClick={handleLogout} />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center">
                    {loading ? (
                        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                    ) : content.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 mt-16">
                            <div className="text-5xl mb-4">🧠</div>
                            <h2 className="text-2xl font-semibold mb-2">Your brain is empty</h2>
                            <p className="mb-6">
                                Start saving useful articles, videos, or tweets to build your second brain.
                            </p>
                            <Button
                                variant="Primary"
                                text="Add your first content"
                                startIcon={<PlusIcon />}
                                size="md"
                                onClick={() => setModalOpen(true)}
                            />
                        </div>
                    ) : filteredContent.length === 0 ? (
                        <div className="text-center text-gray-600 dark:text-gray-300 mt-16">
                            <p>
                                No results for "<strong>{search}</strong>"
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                            {filteredContent.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{delay: index * 0.05}}
                                >
                                    <Card
                                        {...item}
                                        tags={item.tags?.map((tag: any) =>
                                            typeof tag === "string" ? {_id: tag, name: tag} : tag
                                        )}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
