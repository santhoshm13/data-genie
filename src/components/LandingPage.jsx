import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent-primary/30 font-sans relative flex flex-col">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/15 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Navbar Area */}
      <nav className="w-full px-6 py-6 md:px-12 flex justify-between items-center z-10 max-w-7xl mx-auto">
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
      </nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-16 z-10 w-full max-w-6xl mx-auto">
        <div className="mb-6 relative">
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 animate-genie-float" draggable="false" />
        </div>

        <motion.div 
          className="text-center max-w-3xl mb-12"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
          >
            Your personal, magical <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary animate-gradient-x" style={{ backgroundSize: '200% auto' }}>
              AI Data Analyst
            </span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Upload your messy spreadsheets, chat in plain English, and watch as DataGenie instantly cleans, visualizes, and analyzes your data. No coding required.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center gap-2 shadow-lg"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>

        {/* 100% Native, Bulletproof Feature Cards List */}
        <div className="w-full mt-4 md:mt-8 relative z-20 max-w-4xl mx-auto px-2 flex flex-col gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              onClick={onGetStarted}
              className="bg-[#0B0B10] border border-white/10 hover:border-accent-primary/40 p-6 md:p-8 rounded-[28px] transition-all duration-200 group relative overflow-hidden flex flex-col justify-center min-h-[180px] cursor-pointer shadow-lg"
            >
              {/* Background Large Watermark Icon */}
              <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-10 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                {React.cloneElement(feature.icon, { className: "w-40 h-40 md:w-56 md:h-56" })}
              </div>

              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 group-hover:bg-accent-primary/20 group-hover:border-accent-primary/40 transition-colors shrink-0 relative z-10">
                {feature.icon}
              </div>

              <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight relative z-10 group-hover:text-accent-primary transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-lg relative z-10">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs text-gray-600 z-10">
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
