import React from 'react';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-accent-secondary" />,
      title: "Seamless Imports",
      description: "Instantly connect and import your data from CSV, Excel, or live Google Sheets with zero configuration."
    },
    {
      icon: <Wand2 className="w-6 h-6 text-accent-primary" />,
      title: "Magical Transformations",
      description: "Clean, filter, and process messy datasets effortlessly using plain English commands."
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-accent-pink" />,
      title: "Interactive Charts",
      description: "Generate beautiful, responsive line, bar, and pie charts instantly to visualize your insights."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-accent-green" />,
      title: "AI Chatbot Analyst",
      description: "Chat with your data. Ask complex questions and get instant, accurate analytical answers."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-10 h-10 object-contain" draggable="false" />
          <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">DataGenie</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="text-sm font-semibold text-gray-300 hover:text-white"
        >
          Sign In
        </button>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-16 w-full max-w-6xl mx-auto text-center">
        <img 
          src="/logo_transparent.png" 
          alt="DataGenie Logo" 
          className="w-24 h-24 md:w-32 md:h-32 object-contain mb-6" 
          draggable="false" 
        />

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Your personal, magical <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary">
            AI Data Analyst
          </span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-8 max-w-2xl leading-relaxed">
          Upload your messy spreadsheets, chat in plain English, and watch as DataGenie instantly cleans, visualizes, and analyzes your data. No coding required.
        </p>
        
        <button 
          onClick={onGetStarted}
          className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg flex items-center gap-2 shadow-lg mb-16"
        >
          <span>Get Started for Free</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* 100% Static Idle Feature Cards (Zero Scroll Animations, Zero Overlap, Zero Hover Transitions) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              onClick={onGetStarted}
              className="bg-[#0D0D12] border border-white/10 p-8 rounded-[28px] relative overflow-hidden flex flex-col justify-center min-h-[200px] cursor-pointer shadow-md"
            >
              {/* Static Watermark Background Icon */}
              <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-[0.04] pointer-events-none">
                {React.cloneElement(feature.icon, { className: "w-44 h-44 md:w-52 md:h-52" })}
              </div>

              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shrink-0 relative z-10">
                {feature.icon}
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight relative z-10">
                {feature.title}
              </h2>
              
              <p className="text-gray-400 text-sm md:text-base leading-relaxed relative z-10">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs text-gray-600">
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
