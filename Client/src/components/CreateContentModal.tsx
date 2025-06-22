import {useEffect, useState, useRef} from "react";
import {X} from "lucide-react";
import axios from "axios";

interface Props {
    open: boolean;
    onClose: () => void;
    onContentAdded?: () => void;
}

const TYPES = ["link", "video", "document", "tweet"];

export const CreateContentModal = ({open, onClose, onContentAdded}: Props) => {
    const [title, setTitle] = useState("");
    const [link, setLink] = useState("");
    const [type, setType] = useState("link");
    const [tags, setTags] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const titleRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (open && titleRef.current) {
            titleRef.current.focus();
        }
    }, [open]);

    const resetForm = () => {
        setTitle("");
        setLink("");
        setType("link");
        setTags("");
        setError("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        let fixedLink = link.trim();

        if (!/^https?:\/\//i.test(fixedLink)) {
            fixedLink = "https://" + fixedLink;
        }

        try {
            new URL(fixedLink);
        } catch {
            setError("Please enter a valid URL");
            setLoading(false);
            return;
        }

        try {
            await axios.post(
                "http://localhost:9898/api/v1/content",
                {
                    title,
                    link: fixedLink,
                    type,
                    tags: tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    withCredentials: true,
                }
            );

            onContentAdded?.();
            resetForm();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) resetForm();
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
        >
            <div className="w-full max-w-md bg-white dark:bg-gray-900 text-black dark:text-white rounded-xl p-6 sm:p-8 shadow-2xl relative">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition"
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>

                <h2 id="modal-title" className="text-2xl font-semibold mb-4">
                    Add New Content
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            ref={titleRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Your content title"
                            required
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Link</label>
                        <input
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="e.g. www.example.com"
                            required
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                        >
                            {TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. react, typescript"
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
                    >
                        {loading ? "Saving..." : "Add Content"}
                    </button>
                </form>
            </div>
        </div>
    );
};
