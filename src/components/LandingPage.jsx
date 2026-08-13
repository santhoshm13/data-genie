import React from 'react';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-accent-secondary" />,
      title: "Seamless Imports",
      description: "Connect CSV, Excel, or Google Sheets with zero configuration."
    },
    {
      icon: <Wand2 className="w-5 h-5 text-accent-primary" />,
      title: "Magical Transformations",
      description: "Clean, filter, and modify datasets using plain English."
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-accent-pink" />,
      title: "Interactive Charts",
      description: "Generate responsive line, bar, and pie charts instantly."
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-accent-green" />,
      title: "AI Chatbot Analyst",
      description: "Chat directly with your data and get instant answers."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-10 h-10 object-contain" draggable="false" />
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-4xl mx-auto w-full">
        <img 
          src="/logo_transparent.png" 
          alt="DataGenie Logo" 
          className="w-24 h-24 md:w-32 md:h-32 object-contain mb-6" 
          draggable="false" 
        />

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your personal, magical <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary">
            AI Data Analyst
          </span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-8 max-w-2xl leading-relaxed">
          Upload your messy spreadsheets, chat in plain English, and watch as DataGenie instantly cleans, visualizes, and analyzes your data.
        </p>
        
        <button 
          onClick={onGetStarted}
          className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg mb-16"
        >
          <span>Get Started for Free</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Clean Static Feature List (Simple Row View, No Cards, No Animations) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left border-t border-white/10 pt-10">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-1 border border-white/10">
                {feature.icon}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">{feature.title}</h2>
              <p className="text-xs text-gray-400 leading-normal">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-gray-600">
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
