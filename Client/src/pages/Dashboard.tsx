import {useEffect, useState} from "react";
import {Card} from "../components/Card";
import {Button} from "../components/Button";
import {PlusIcon} from "../Icons/PlusIcon";
import {ShareIcon} from "../Icons/ShareIcon";
import {CreateContentModal} from "../components/CreateContentModal";
import {Sidebar} from "../components/Sidebar";
import {toggleDarkMode, initTheme} from "../utils/theme";

function Dashboard() {
    const [modalOpen, setModalOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load theme on mount
    useEffect(() => {
        initTheme();
        setIsDarkMode(document.documentElement.classList.contains("dark"));
    }, []);

    const handleToggleTheme = () => {
        toggleDarkMode();
        setIsDarkMode(!isDarkMode);
    };

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <Sidebar />

            <main className="ml-76 w-full p-6">
                <CreateContentModal open={modalOpen} onClose={() => setModalOpen(false)} />

                {/* Top right buttons */}
                <div className="flex justify-end gap-4 mb-6">
                    <Button
                        variant="Secondary"
                        text={isDarkMode ? "🌞" : "🌙"}
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
                </div>

                {/* Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card
                        title="Sample Tweet"
                        link="https://x.com/iamvictorjack/status/1917498890800226589"
                        type="tweet"
                    />
                    <Card
                        title="Intro to Tailwind Video"
                        link="https://www.youtube.com/watch?v=VgnqL0DDLC4"
                        type="video"
                    />
                    <Card title="Tailwind Docs" link="https://tailwindcss.com/docs" type="link" />
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
