import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare, Database, Share2, Sparkles } from 'lucide-react';


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
      {/* Lightweight Ambient Backgrounds without GPU-heavy blur/mix-blend */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/15 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Navbar Area */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full px-6 py-6 md:px-12 flex justify-between items-center z-10 max-w-7xl mx-auto"
      >
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
      </motion.nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-8 pb-16 z-10 w-full max-w-6xl mx-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8 relative"
        >
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-28 h-28 md:w-36 md:h-36 object-contain relative z-10 animate-genie-float" draggable="false" />
        </motion.div>

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
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
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

        {/* Movable / Swipeable Feature Cards Carousel */}
        <div className="w-full mt-6 md:mt-12 relative z-20 max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Key Capabilities
            </span>
            <span className="text-xs text-gray-500 font-medium animate-pulse">
              Swipe to explore →
            </span>
          </div>

          {/* Touch-Movable Scroll Container */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-6 pt-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 touch-pan-x">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGetStarted}
                className="snap-center shrink-0 w-[82vw] sm:w-[320px] md:w-[350px] bg-[#0E0E14] border border-white/10 hover:border-accent-primary/40 p-6 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-300 group flex flex-col justify-between shadow-xl relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-bl-full pointer-events-none group-hover:bg-accent-primary/10 transition-colors"></div>
                <div>
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-5 border border-white/10 group-hover:bg-accent-primary/20 group-hover:border-accent-primary/40 transition-colors shadow-inner">
                    {feature.icon}
                  </div>
                  
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary mb-1.5 block">Feature 0{index + 1}</span>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2.5 tracking-tight group-hover:text-accent-primary transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">
                  <span>Try this feature</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-accent-primary" />
                </div>
              </motion.div>
            ))}
          </div>
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
