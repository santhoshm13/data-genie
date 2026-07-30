import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, CheckCircle, List, FileSpreadsheet, AlertTriangle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../theme';

export default function DataQualityCard({ report, onAskFix }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!report) return null;

  const hasIssues = report.issues && report.issues.length > 0;

  return (
    <div className="w-full bg-bg-card rounded-2xl shadow-sm border border-white/10 overflow-hidden font-sans my-2">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${hasIssues ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
            {hasIssues ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Data Quality Report
              {report.isSampled && <span className="text-[10px] bg-blue-500/20 text-accent-secondary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Sampled</span>}
            </h3>
            <p className="text-sm text-gray-400 font-medium">
              {hasIssues ? `${report.issues.length} potential issues found` : "Looks good! No major issues detected."}
            </p>
          </div>
        </div>
        <div className="text-gray-500">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-bg-panel/50"
          >
            <div className="p-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-bg-card p-3 rounded-xl border border-white/5 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Rows</span>
                  <span className="text-xl font-bold text-gray-200">{report.actualTotalRows.toLocaleString()}</span>
                </div>
                <div className="bg-bg-card p-3 rounded-xl border border-white/5 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Columns</span>
                  <span className="text-xl font-bold text-gray-200">{report.totalCols.toLocaleString()}</span>
                </div>
                <div className="bg-bg-card p-3 rounded-xl border border-white/5 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Duplicates</span>
                  <span className="text-xl font-bold text-gray-200">{report.duplicateRows.toLocaleString()}</span>
                </div>
              </div>

              {/* Issues List */}
              {hasIssues && (
                <div className="mb-2">
                  <h4 className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" /> Detected Issues
                  </h4>
                  <ul className="space-y-1.5 bg-bg-card border border-white/5 rounded-xl p-3 shadow-sm mb-4">
                    {report.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span> 
                        <span className="leading-snug">{issue}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {onAskFix && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const prompt = `Please clean this dataset by addressing the following issues:\n${report.issues.map(i => '- ' + i).join('\n')}`;
                        onAskFix(prompt);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Ask AI to Fix Issues
                    </motion.button>
                  )}
                </div>
              )}

              {/* Column Stats Summary (Optional, maybe just mention it's analyzed) */}
              {!hasIssues && (
                 <div className="bg-bg-card border border-green-500/20 rounded-xl p-4 shadow-sm text-center">
                   <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                   <p className="text-sm text-gray-400">The dataset appears clean! Missing values are low, and no row-level duplicates were found.</p>
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
