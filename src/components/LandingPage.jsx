import React from 'react';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare, Sparkles } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-cyan-400" />,
      tag: "Data Integration",
      title: "Seamless Imports",
      description: "Connect CSV, Excel, or live Google Sheets instantly with zero manual configuration."
    },
    {
      icon: <Wand2 className="w-6 h-6 text-purple-400" />,
      tag: "Smart Processing",
      title: "Magical Transformations",
      description: "Clean, filter, and process messy datasets effortlessly using plain English prompts."
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-pink-400" />,
      tag: "Visual Analytics",
      title: "Interactive Charts",
      description: "Generate beautiful, responsive line, bar, and pie charts instantly to visualize key insights."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
      tag: "Conversational Intelligence",
      title: "AI Chatbot Analyst",
      description: "Chat with your data. Ask complex questions and get instant, accurate analytical answers."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col justify-between selection:bg-purple-500/30">
      {/* Top Navbar */}
      <header className="w-full px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" draggable="false" />
          <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">DataGenie</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-16 w-full max-w-6xl mx-auto text-center">
        <img 
          src="/logo_transparent.png" 
          alt="DataGenie Logo" 
          className="w-24 h-24 md:w-32 md:h-32 object-contain mb-6 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" 
          draggable="false" 
        />

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Your personal, magical <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400">
            AI Data Analyst
          </span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
          Upload your messy spreadsheets, chat in plain English, and watch as DataGenie instantly cleans, visualizes, and analyzes your data. No coding required.
        </p>
        
        <button 
          onClick={onGetStarted}
          className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-16"
        >
          <span>Get Started for Free</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Premium, Native 2x2 Feature Cards Grid */}
        <div className="w-full max-w-5xl mx-auto text-left pt-6">
          <div className="flex items-center justify-between mb-8 px-1 border-b border-white/10 pb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Built for modern data workflows
            </h2>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              Instant AI Intelligence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                onClick={onGetStarted}
                className="bg-[#0C0C10] border border-white/10 hover:border-purple-500/40 p-6 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group cursor-pointer relative overflow-hidden flex flex-col justify-between"
              >
                {/* Subtle gradient hover layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-colors">
                    {feature.icon}
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2 block">
                    {feature.tag}
                  </span>

                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2.5 tracking-tight group-hover:text-purple-300 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">
                  <span>Explore capability</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-purple-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs text-gray-600 border-t border-white/5">
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
