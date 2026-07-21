import React from 'react';

function Landing() {
    const targetUrl = 'https://rambhaji.frontend.shreenari.com/login';

    const handleNavigate = (e) => {
        e.preventDefault();
        window.location.href = targetUrl;
    };

    return (
        // पूरा viewport, ग्रेडिएंट बैकग्राउंड, सेंटर में कार्ड
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">

            {/* Glassmorphism कार्ड */}
            <div className="max-w-lg w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-12 text-center transition-transform hover:scale-[1.01] hover:shadow-3xl">

                {/* आइकन (रॉकेट) */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-purple-500/10 rounded-full border border-purple-400/20 transition-transform hover:scale-105 hover:rotate-[-6deg]">
                        <svg
                            className="w-14 h-14 text-purple-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                </div>

                {/* शीर्षक */}
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#f0eaff] to-[#c4b5fd] bg-clip-text text-transparent mb-3">
                    Welcome to Our Platform
                </h1>

                {/* विवरण */}
                <p className="text-gray-300/80 text-base md:text-lg leading-relaxed mb-6">
                    You are just one click away from accessing your dashboard.
                </p>

                {/* लिंक बॉक्स */}
                <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5 hover:border-purple-400/30 transition-colors">
                    <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                        🔗 Please click this link:
                    </span>
                    <a
                        href={targetUrl}
                        onClick={handleNavigate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm md:text-base font-medium text-purple-300 hover:text-purple-200 bg-purple-500/10 px-3 py-1.5 rounded-lg break-all transition-all hover:bg-purple-500/20 hover:scale-[1.02]"
                    >
                        {targetUrl}
                    </a>
                </div>

                {/* मुख्य CTA बटन */}
                <button
                    onClick={handleNavigate}
                    className="w-full max-w-xs mx-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-8 rounded-full shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 text-lg flex items-center justify-center gap-2"
                >
                    🚀 Go to Login
                </button>

                {/* फुटर नोट */}
                <p className="text-gray-500/60 text-sm mt-6">
                    You will be redirected to the official login page.
                </p>
            </div>
        </div>
    );
}

export default Landing;