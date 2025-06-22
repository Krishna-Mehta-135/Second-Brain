import {useNavigate} from "react-router-dom";
import {Button} from "../components/Button";
import {ThemeToggle} from "../components/ThemeToggle";
import {BookmarkCheck, BookOpen, Share2, User, Zap, Globe} from "lucide-react";

export default function Homepage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Navbar */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-blue-700 dark:text-white">🧠 Second Brain</h1>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Button size="sm" variant="Secondary" text="Sign In" onClick={() => navigate("/signin")} />
                    <Button size="sm" variant="Primary" text="Get Started" onClick={() => navigate("/signup")} />
                </div>
            </header>

            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight mb-4 text-blue-800 dark:text-white">
                    Your Digital Brain for Everything That Matters.
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mb-6">
                    Capture links, organize ideas, and never forget what makes you smarter.
                </p>
                <Button text="Start Building →" variant="Primary" size="lg" onClick={() => navigate("/signup")} />
            </section>

            {/* Features Section */}
            <section className="bg-gray-100 dark:bg-gray-800 py-12 px-6">
                <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
                    <Feature
                        icon={<BookmarkCheck className="text-blue-600 mb-2" />}
                        title="Save Anything"
                        desc="From tweets to tutorials — just paste the link."
                    />
                    <Feature
                        icon={<BookOpen className="text-blue-600 mb-2" />}
                        title="Organize Everything"
                        desc="Use tags and types to stay structured."
                    />
                    <Feature
                        icon={<Share2 className="text-blue-600 mb-2" />}
                        title="Review & Share"
                        desc="Revisit saved content and grow smarter."
                    />
                </div>
            </section>

            {/* Use-Cases Section */}
            <section className="py-12 px-6 bg-white dark:bg-gray-900">
                <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 text-left">
                    <UseCase
                        icon={<User className="text-blue-700 mb-2" />}
                        title="Students"
                        desc="Track class notes, references, and videos."
                    />
                    <UseCase
                        icon={<Zap className="text-blue-700 mb-2" />}
                        title="Developers"
                        desc="Save docs, code snippets, and tooling links."
                    />
                    <UseCase
                        icon={<Globe className="text-blue-700 mb-2" />}
                        title="Lifelong Learners"
                        desc="Capture insights, quotes, and big ideas."
                    />
                </div>
            </section>

            {/* Final CTA */}
            <section className="text-center bg-blue-50 dark:bg-gray-800 py-16 px-4">
                <h3 className="text-2xl font-bold mb-4 text-blue-800 dark:text-white">Forget Less. Grow More.</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">
                    Your thoughts deserve a Second Brain — start building now.
                </p>
                <Button className="flex justify-center"
                    text="Join the Future of Thinking"
                    variant="Primary"
                    size="lg"
                    onClick={() => navigate("/signup")}
                />
            </section>

            {/* Footer */}
            <footer className="text-center py-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                © {new Date().getFullYear()} Second Brain • Built by Team Ascend
            </footer>
        </div>
    );
}

// Reusable Components
function Feature({icon, title, desc}: {icon: React.ReactNode; title: string; desc: string}) {
    return (
        <div>
            <div className="text-3xl mb-2">{icon}</div>
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
        </div>
    );
}

function UseCase({icon, title, desc}: {icon: React.ReactNode; title: string; desc: string}) {
    return (
        <div>
            <div className="text-xl">{icon}</div>
            <h5 className="font-semibold mb-1">{title}</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
        </div>
    );
}
