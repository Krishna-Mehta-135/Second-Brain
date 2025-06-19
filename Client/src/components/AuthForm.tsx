import {useState, useEffect} from "react";
import axios from "axios";
import {toggleDarkMode, initTheme} from "../utils/theme";
import {useNavigate} from "react-router-dom";

type AuthType = "signup" | "signin";

interface AuthProps {
    type: AuthType;
}

export default function AuthForm({type}: AuthProps) {
    const [credential, setCredential] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        initTheme();
        setIsDarkMode(document.documentElement.classList.contains("dark"));
    }, []);

    const handleToggleTheme = () => {
        toggleDarkMode();
        setIsDarkMode(!isDarkMode);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint =
                type === "signup"
                    ? "http://localhost:9898/api/v1/auth/register"
                    : "http://localhost:9898/api/v1/auth/login";

            const payload = type === "signup" ? {username, email: credential, password} : {credential, password};

            const res = await axios.post(endpoint, payload);
            console.log("🔍 Payload:", payload);

            console.log("✅ Success:", res.data);
            setError("");
            localStorage.setItem("token", res.data.data.token);
            navigate("/dashboard");
        } catch (error: any) {
            setError(error.response?.data?.message || "Something went wrong");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-900 transition-colors duration-300 px-4 relative">
            <div className="absolute top-4 right-4">
                <button
                    onClick={handleToggleTheme}
                    className="text-xl px-3 py-1 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white shadow hover:scale-105 transition"
                >
                    {isDarkMode ? "🌞" : "🌙"}
                </button>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
                <div className="mb-6 text-center">
                    <h1 className="text-4xl font-bold text-blue-700 dark:text-white">🧠 Second Brain</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Capture ideas. Grow knowledge. Never forget.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center text-blue-800 dark:text-white">
                        {type === "signup" ? "Create your account" : "Welcome back"}
                    </h2>

                    {type === "signup" && (
                        <div>
                            <label className="block text-sm font-medium text-blue-700 dark:text-white mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                placeholder="Your username"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-white mb-1">
                            {type === "signup" ? "Email" : "Email or Username"}
                        </label>
                        <input
                            type="text"
                            placeholder={type === "signup" ? "you@example.com" : "you@example.com or yourusername"}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            value={credential}
                            onChange={(e) => setCredential(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-white mb-1">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        {type === "signup" ? "Sign Up" : "Sign In"}
                    </button>
                </form>

                <p className="text-xs text-center mt-4 text-gray-400 dark:text-gray-500">
                    Your thoughts deserve a Second Brain.
                </p>
            </div>
        </div>
    );
}
