import React from 'react';
import { ArrowRight } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
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
          className="w-28 h-28 md:w-36 md:h-36 object-contain mb-8" 
          draggable="false" 
        />

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Your personal, magical <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary">
            AI Data Analyst
          </span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
          Upload your messy spreadsheets, chat in plain English, and watch as DataGenie instantly cleans, visualizes, and analyzes your data. No coding required.
        </p>
        
        <button 
          onClick={onGetStarted}
          className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg"
        >
          <span>Get Started for Free</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs text-gray-600">
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
