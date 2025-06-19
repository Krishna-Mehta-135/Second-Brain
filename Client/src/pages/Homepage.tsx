import {useNavigate} from "react-router-dom";
import {Button} from "../components/Button";
import {ThemeToggle} from "../components/ThemeToggle";
import {BookOpen, BookmarkCheck, Share2, User, Zap, Globe} from "lucide-react";

export default function Homepage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-blue-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
            {/* Header */}
            <header className="p-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-800 dark:text-white">Second Brain 🧠</h1>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Button size="sm" variant="Secondary" text="Sign In" onClick={() => navigate("/signin")} />
                    <Button size="sm" variant="Primary" text="Sign Up" onClick={() => navigate("/signup")} />
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-blue-800 dark:text-white mb-4 leading-tight">
                    Capture. Reflect. Grow.
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 max-w-xl mb-8">
                    Second Brain helps you save and organize everything that matters — articles, tweets, videos, and
                    more.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button variant="Primary" text="Get Started" onClick={() => navigate("/signup")} size="lg" />
                    <Button variant="Secondary" text="Sign In" onClick={() => navigate("/signin")} size="lg" />
                </div>
            </main>

            {/* Features */}
            <section className="py-20 px-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                <div className="max-w-6xl mx-auto grid gap-12 sm:grid-cols-3 text-center">
                    <div>
                        <BookmarkCheck size={40} className="mx-auto mb-4 text-blue-600" />
                        <h3 className="text-xl font-semibold mb-2">Save Anything</h3>
                        <p className="text-sm">
                            Tweets, videos, articles — add them to your Second Brain with just a link.
                        </p>
                    </div>
                    <div>
                        <BookOpen size={40} className="mx-auto mb-4 text-blue-600" />
                        <h3 className="text-xl font-semibold mb-2">Stay Organized</h3>
                        <p className="text-sm">Use tags and types to keep your content categorized and searchable.</p>
                    </div>
                    <div>
                        <Share2 size={40} className="mx-auto mb-4 text-blue-600" />
                        <h3 className="text-xl font-semibold mb-2">Share & Grow</h3>
                        <p className="text-sm">
                            Build your library, share your collection, and grow with your digital brain.
                        </p>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-20 px-6 bg-blue-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <div className="max-w-5xl mx-auto text-center">
                    <h3 className="text-3xl font-bold mb-10">Who is this for?</h3>
                    <div className="grid sm:grid-cols-3 gap-8 text-left">
                        <div>
                            <User className="text-blue-700 mb-2" />
                            <h4 className="font-semibold mb-1">Students</h4>
                            <p className="text-sm">Save useful academic resources and notes across subjects.</p>
                        </div>
                        <div>
                            <Zap className="text-blue-700 mb-2" />
                            <h4 className="font-semibold mb-1">Developers</h4>
                            <p className="text-sm">Organize code snippets, docs, and reference links.</p>
                        </div>
                        <div>
                            <Globe className="text-blue-700 mb-2" />
                            <h4 className="font-semibold mb-1">Lifelong Learners</h4>
                            <p className="text-sm">Track ideas, quotes, philosophy, or journaling prompts.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 px-6 bg-white dark:bg-gray-800 text-center text-gray-800 dark:text-gray-100">
                <h3 className="text-3xl font-bold mb-12">How It Works</h3>
                <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-10">
                    <div>
                        <div className="text-4xl mb-2 text-blue-600 font-bold">1</div>
                        <h4 className="font-semibold mb-1">Add Content</h4>
                        <p className="text-sm">Paste any useful link — video, tweet, article, or resource.</p>
                    </div>
                    <div>
                        <div className="text-4xl mb-2 text-blue-600 font-bold">2</div>
                        <h4 className="font-semibold mb-1">Organize it</h4>
                        <p className="text-sm">Use tags and types to build structure into your collection.</p>
                    </div>
                    <div>
                        <div className="text-4xl mb-2 text-blue-600 font-bold">3</div>
                        <h4 className="font-semibold mb-1">Review & Grow</h4>
                        <p className="text-sm">Come back anytime to reflect, reuse, or share knowledge.</p>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6 bg-blue-200 dark:bg-gray-700 text-center">
                <h3 className="text-3xl font-bold text-blue-900 dark:text-white mb-4">Stop forgetting what matters.</h3>
                <p className="mb-6 text-gray-800 dark:text-gray-200">
                    Save what fuels your growth — organize it, revisit it, and let your Second Brain evolve with you.
                </p>
                <Button
                    variant="Primary"
                    text="Build Your Second Brain →"
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className = "mx-auto"
                />
            </section>

            {/* Footer */}
            <footer className="p-6 text-center bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
                <p>Made with 💙 by Team Ascend • © {new Date().getFullYear()} Second Brain</p>
            </footer>
        </div>
    );
}
