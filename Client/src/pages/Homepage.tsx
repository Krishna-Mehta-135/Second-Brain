import {useNavigate} from "react-router-dom";
import {Button} from "../components/Button";
import {ThemeToggle} from "../components/ThemeToggle";
import {Brain, Twitter, Youtube, FileText, Link2, Search, Tags, Share2, ArrowRight, Sparkles} from "lucide-react";

export default function Homepage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800 transition-all duration-500">
            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Second Brain
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Button size="md" variant="Secondary" text="Sign In" onClick={() => navigate("/signin")} />
                    <Button size="md" variant="Primary" text="Get Started" onClick={() => navigate("/signup")} />
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative px-6 py-20 text-center">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
                </div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full text-sm text-purple-600 dark:text-purple-400 mb-8 border border-purple-200 dark:border-purple-800">
                        <Sparkles className="h-4 w-4" />
                        Your digital knowledge companion
                    </div>
                    
                    <h2 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 dark:from-white dark:via-purple-100 dark:to-blue-100 bg-clip-text text-transparent">
                            Build Your
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Second Brain
                        </span>
                    </h2>
                    
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Capture knowledge from anywhere. Organize it intelligently. 
                        Access it instantly. Transform scattered information into structured wisdom.
                    </p>

                    {/* Content Sources Visual */}
                    <div className="flex justify-center items-center gap-4 mb-12 flex-wrap">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                            <Twitter className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tweets</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                            <Youtube className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Videos</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                            <FileText className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Articles</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                            <Link2 className="h-5 w-5 text-purple-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Links</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                        <Button 
                            variant="Primary" 
                            text="Start Building" 
                            onClick={() => navigate("/signup")} 
                            size="lg"
                            startIcon={<ArrowRight className="h-5 w-5" />}
                        />
                        <Button 
                            variant="Secondary" 
                            text="See How It Works" 
                            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'})}
                            size="lg" 
                        />
                    </div>
                </div>
            </main>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 px-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 dark:from-white dark:to-purple-100 bg-clip-text text-transparent mb-4">
                            How Your Second Brain Works
                        </h3>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Three simple steps to transform scattered information into organized knowledge
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Step 1 */}
                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Link2 className="h-8 w-8 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-gray-900">
                                    1
                                </div>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Capture Instantly</h4>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                Drop any link, tweet, or article. Our smart system automatically categorizes and extracts key information.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Tags className="h-8 w-8 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-gray-900">
                                    2
                                </div>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Organize Smartly</h4>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                Tag your content, create categories, and build connections. Let your knowledge graph grow organically.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Search className="h-8 w-8 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-gray-900">
                                    3
                                </div>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Discover & Share</h4>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                Find what you need instantly with powerful search. Share your curated collections with others.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-24 px-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-slate-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 dark:from-white dark:to-purple-100 bg-clip-text text-transparent mb-4">
                            Powerful Features for Knowledge Workers
                        </h3>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Everything you need to build and maintain your digital knowledge base
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                                <Brain className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Smart Categorization</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Automatically organize content by type and topic. Never lose track of important information again.
                            </p>
                        </div>

                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                                <Search className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Instant Search</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Find any piece of content in seconds with our powerful search that understands context and tags.
                            </p>
                        </div>

                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                                <Share2 className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Easy Sharing</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Share your knowledge collections with teams, friends, or the public with secure sharing links.
                            </p>
                        </div>

                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                                <Tags className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Dynamic Tagging</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Create and manage tags on the fly. Build your own taxonomy that evolves with your knowledge.
                            </p>
                        </div>

                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Multi-Format Support</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Save tweets, YouTube videos, articles, PDFs, and any web content in one unified interface.
                            </p>
                        </div>

                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Beautiful Interface</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                Clean, intuitive design that gets out of your way. Focus on learning, not on managing tools.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Final CTA */}
            <section className="py-24 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h3 className="text-4xl font-bold text-white mb-6">
                        Ready to Build Your Second Brain?
                    </h3>
                    <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Join thousands of knowledge workers, students, and creators who have transformed 
                        how they capture and organize information.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="Primary"
                            text="Start Free Today"
                            size="lg"
                            onClick={() => navigate("/signup")}
                            className="!bg-white !text-blue-600 hover:!bg-blue-50 border-0 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                            startIcon={<ArrowRight className="h-5 w-5" />}
                        />
                        <Button
                            variant="Secondary"
                            text="Sign In"
                            size="lg"
                            onClick={() => navigate("/signin")}
                            className="!bg-transparent !text-white !border-2 !border-white hover:!bg-white hover:!text-blue-600 transition-all duration-300 font-semibold"
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="p-8 text-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                            <Brain className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Second Brain
                        </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Made for knowledge enthusiasts • © {new Date().getFullYear()} Second Brain
                    </p>
                </div>
            </footer>
        </div>
    );
}
