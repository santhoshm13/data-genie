import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileSpreadsheet, Wand2, BarChart2, MessageSquare, Database, Share2, Sparkles } from 'lucide-react';
import ScrollStack, { ScrollStackItem } from './ScrollStack';

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
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-accent-primary/30 font-sans relative flex flex-col">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-accent-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none -translate-y-1/2"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-accent-secondary/15 rounded-full blur-[150px] mix-blend-screen pointer-events-none translate-y-1/4"></div>
      
      {/* Navbar Area */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full px-6 py-6 md:px-12 flex justify-between items-center z-10"
      >
        <div className="flex items-center gap-3">
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]" draggable="false" />
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-20 z-10 w-full max-w-6xl mx-auto">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary to-accent-secondary blur-[40px] opacity-30 rounded-full"></div>
          <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 drop-shadow-[0_0_25px_rgba(139,92,246,0.8)] animate-genie-float" draggable="false" />
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
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span>Get Started for Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Stack Animation */}
        <div className="w-full mt-8 md:mt-16 relative z-20 max-w-4xl mx-auto">
          <ScrollStack
            useWindowScroll={true}
            itemDistance={40}
            baseScale={0.85}
            itemScale={0.05}
            scaleEndPosition="15%"
            className="w-full"
          >
            {features.map((feature, index) => (
              <ScrollStackItem key={index} itemClassName="!p-0 !bg-transparent !shadow-none !h-auto">
                <div className="bg-gradient-to-b from-[#1A1A1D] to-bg-main backdrop-blur-2xl border border-white/10 hover:border-white/20 p-8 md:p-12 rounded-[40px] transition-all duration-500 group relative overflow-hidden shadow-2xl h-[350px] md:h-[400px] flex flex-col justify-center">
                  
                  {/* Background Large Icon */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-700 pointer-events-none hidden md:block">
                    {React.cloneElement(feature.icon, { className: "w-64 h-64" })}
                  </div>

                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-white/10 transition-colors shadow-inner relative z-10">
                    {feature.icon}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight relative z-10">{feature.title}</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl relative z-10">{feature.description}</p>
                  
                  {/* Subtle hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="w-full text-center py-8 text-xs text-gray-600 z-10"
      >
        <p>© {new Date().getFullYear()} DataGenie. Powered by Gemini AI.</p>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
