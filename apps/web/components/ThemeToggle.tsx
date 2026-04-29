// components/ThemeToggle.tsx
import {useState, useEffect} from "react";
import {toggleDarkMode} from "../utils/theme"; // adjust path

export const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
    }, []);

    const handleToggle = () => {
        toggleDarkMode();
        setIsDark(!isDark);
    };

    return (
        <button
            onClick={handleToggle}
            className="p-2 text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
        >
            {isDark ? "☀️" : "🌙"}
        </button>
    );
};
