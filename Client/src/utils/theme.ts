// utils/theme.ts
export const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
        html.classList.remove("dark");
        localStorage.setItem("theme", "light");
    } else {
        html.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }
};

export const initTheme = () => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark") {
        html.classList.add("dark");
    } else {
        html.classList.remove("dark");
    }
};
