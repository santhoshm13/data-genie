import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(false); // Defaulting to Signup as requested
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [focusedInput, setFocusedInput] = useState(null);

  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return Math.min(100, score);
  };
  
  const strength = calculateStrength(password);
  
  let strengthColor = 'bg-gray-700';
  if (strength > 0 && strength <= 25) strengthColor = 'bg-red-500';
  else if (strength <= 50) strengthColor = 'bg-yellow-500';
  else if (strength <= 75) strengthColor = 'bg-blue-400';
  else if (strength > 75) strengthColor = 'bg-green-500';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && strength < 50) {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
      
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      // We don't save the Google token here because it lacks the spreadsheet scopes. 
      // App.jsx will prompt for spreadsheet scopes when the user first tries to access a sheet.
      setSuccess(true);
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
      setLoading(false);
    }
  };

  const genieTransition = {
    type: "spring",
    damping: 15,
    stiffness: 150,
    mass: 1,
    ease: [0.16, 1, 0.3, 1]
  };

  const cardVariants = {
    hidden: { scale: 0.1, y: 150, opacity: 0, borderRadius: "50%" },
    visible: { 
      scale: 1, 
      y: 0, 
      opacity: 1,
      borderRadius: "20px",
      transition: { ...genieTransition, duration: 0.8 } 
    },
    exit: { scale: 0.8, opacity: 0, transition: { duration: 0.3 } }
  };

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-bg-main font-sans overflow-hidden">
      
      {/* Left Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10 px-6 sm:px-12">
        {/* Subtle background glow for the form area */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#6D28D9]/20 to-transparent opacity-50 blur-3xl rounded-full mix-blend-screen" />
        </div>

        <AnimatePresence>
          <motion.div 
            className="relative z-10 w-full max-w-[400px]"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, ...genieTransition }}
              className="w-16 h-16 mb-4 relative"
            >
              <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]" draggable="false" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-[#9CA3AF] text-sm text-center">
              {isLogin ? 'Enter your details to access your dashboard' : 'Unlock the magic of your data in seconds'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    "relative flex items-center border rounded-xl bg-bg-main/50 transition-all duration-300 overflow-hidden",
                    focusedInput === 'name' ? 'border-accent-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-white/10 hover:border-white/20'
                  )}>
                    <label htmlFor="name-input" className="sr-only">Full Name</label>
                    <input 
                      id="name-input"
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-transparent px-4 py-3.5 text-white focus:outline-none placeholder-gray-500 text-sm"
                      placeholder="Full Name"
                      autoComplete="name"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "relative flex items-center border rounded-xl bg-bg-main/50 transition-all duration-300 overflow-hidden",
              focusedInput === 'email' ? 'border-accent-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-white/10 hover:border-white/20'
            )}>
              <label htmlFor="email-input" className="sr-only">Email address</label>
              <input 
                id="email-input"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                className="w-full bg-transparent px-4 py-3.5 text-white focus:outline-none placeholder-gray-500 text-sm"
                placeholder="Email address"
                autoComplete="email"
                required 
              />
            </div>

            <div className={cn(
              "relative flex items-center border rounded-xl bg-bg-main/50 transition-all duration-300 overflow-hidden",
              focusedInput === 'password' ? 'border-accent-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-white/10 hover:border-white/20'
            )}>
              <label htmlFor="password-input" className="sr-only">Password</label>
              <input 
                id="password-input"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                className="w-full bg-transparent pl-4 pr-12 py-3.5 text-white focus:outline-none placeholder-gray-500 text-sm"
                placeholder="Password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required 
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <AnimatePresence>
              {!isLogin && password.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col gap-1.5 mt-1 overflow-hidden"
                >
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                    <motion.div 
                      className={`h-full ${strengthColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength}%` }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium tracking-wide">
                    {strength <= 25 && 'Weak'}
                    {strength > 25 && strength <= 50 && 'Fair'}
                    {strength > 50 && strength <= 75 && 'Good'}
                    {strength > 75 && 'Strong'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ ...shakeAnimation, opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span className="leading-tight">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              type="submit" 
              disabled={loading || success}
              whileHover={{ scale: (loading || success) ? 1 : 1.02 }}
              whileTap={{ scale: (loading || success) ? 1 : 0.98 }}
              className="relative w-full h-[52px] mt-4 rounded-xl font-semibold text-white overflow-hidden group disabled:opacity-80"
              style={{
                 background: 'linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)',
                 boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-green-500"
                  >
                    <CheckCircle2 size={24} className="text-white" />
                  </motion.div>
                ) : loading ? (
                  <motion.div
                    key="loading"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </motion.div>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {isLogin ? 'Log In' : 'Create Account'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="px-3 text-xs text-gray-500 font-medium">OR</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <motion.button 
            onClick={handleGoogleSignIn}
            disabled={loading || success}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 bg-bg-main/50 hover:bg-[#1A1A1D] border border-white/10 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Continue with Google
          </motion.button>
          
          <div className="mt-8 text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFocusedInput(null);
                setPassword('');
              }}
              className="text-accent-secondary hover:text-white font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
          
        </motion.div>
      </AnimatePresence>
      </div>

      {/* Right Image Area */}
      <div className="hidden lg:flex w-1/2 relative bg-bg-panel items-center justify-center overflow-hidden border-l border-white/[0.03]">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-bg-main z-10 w-24" />
        <img 
          src="/hero_image.png" 
          alt="DataGenie AI working with massive data" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#0A0A0B_100%)] z-10 pointer-events-none" />
      </div>
    </div>
  );
}

export default Auth;
