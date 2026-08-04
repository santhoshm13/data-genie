import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageSquare, Sidebar as SidebarIcon,
  Upload, ArrowUp, Mic, Share, Download, FileSpreadsheet, Bot, Wand2, Copy, ArrowDown, Menu, X, Trash2, AlertTriangle, Link, RefreshCw, ExternalLink
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartWidget } from './components/ChartWidget';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, getDocs, serverTimestamp, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { generateAIResponse } from './aiRouter';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SpreadsheetSchemaManager } from './lib/SpreadsheetSchemaManager';
import { SpreadsheetExportEngine } from './lib/SpreadsheetExportEngine';
import { DataQualityAnalyzer } from './lib/DataQualityAnalyzer';
import DataQualityCard from './components/DataQualityCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatbotWidget = lazy(() => import('./components/ChatbotWidget').then(m => ({ default: m.ChatbotWidget })));
const LandingPage = lazy(() => import('./components/LandingPage'));
const SignUpPage = lazy(() => import('./SignUpPage'));

const COLORS = ['#5d3fd3', '#7d5dfc', '#9b82ff', '#bca8ff', '#e0d4ff'];

export const getGoogleToken = async (forceRefresh = false) => {
  let token = sessionStorage.getItem('googleToken');
  if (token && !forceRefresh) return token;

  if (!auth.currentUser) {
    throw new Error("You must be logged into DataGenie first.");
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    // Ask user to select an account and grant consent
    provider.setCustomParameters({
      prompt: 'select_account consent'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    token = credential.accessToken;
    sessionStorage.setItem('googleToken', token);
    return token;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      throw new Error("Google API permission was cancelled.");
    }
    throw new Error("Google Authorization Failed: " + err.message);
  }
};
const TransformationWidget = ({ codeString, datasets, activeDatasetName }) => {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveUrl, setDriveUrl] = useState(null);
  
  const activeDataset = activeDatasetName ? datasets[activeDatasetName] : null;

  useEffect(() => {
    if (status !== 'pending') return;
    if (!datasets || Object.keys(datasets).length === 0) {
       setStatus('error');
       setError("Full dataset is no longer available in memory. Please refresh the page and re-upload the file to perform this transformation.");
       return;
    }
    
    setStatus('processing');
    setTimeout(() => {
       try {
         const result = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, codeString);
         
         // In a join scenario where multiple datasets are used, we fallback to the active dataset for original rows count.
         const baseData = activeDataset?.fullData || Object.values(datasets)[0].fullData;
         
         const originalCols = Object.keys(baseData[0] || {}).length;
         const newCols = Object.keys(result[0] || {}).length;
         
         setStats({
           originalRows: baseData.length,
           newRows: result.length,
           originalCols,
           newCols
         });
         setResultData(result);
         setStatus('success');
       } catch (err) {
         setStatus('error');
         setError(err.message);
       }
    }, 100);
  }, [codeString, datasets, activeDatasetName, status]);

  const handleDownloadCsv = () => {
     const blob = SpreadsheetExportEngine.generateCsvBlob(resultData);
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Transformed_${activeDataset?.name?.replace(/\.[^/.]+$/, "") || 'Data'}.csv`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
     const blob = SpreadsheetExportEngine.generateExcelBlob(resultData, "Transformed");
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Transformed_${activeDataset?.name?.replace(/\.[^/.]+$/, "") || 'Data'}.xlsx`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const handleSaveToDrive = async () => {
     try {
        let token = await getGoogleToken();
        setIsSavingDrive(true);
        const cleanName = activeDataset.name.replace(/\.[^/.]+$/, "");
        
        try {
          const url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, activeDataset?.spreadsheetId, activeDataset?.sheetName, activeDataset?.headerIndex);
          setDriveUrl(url);
        } catch (apiErr) {
          if (apiErr.message.includes('401') || apiErr.message.includes('403') || apiErr.message.includes('UNAUTHENTICATED') || apiErr.message.includes('PERMISSION_DENIED')) {
            // Token expired or lacks scopes, force refresh and retry
            token = await getGoogleToken(true);
            const retryUrl = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, activeDataset?.spreadsheetId, activeDataset?.sheetName, activeDataset?.headerIndex);
            setDriveUrl(retryUrl);
          } else {
            throw apiErr;
          }
        }
     } catch (err) {
        setError(err.message);
     } finally {
        setIsSavingDrive(false);
     }
  };

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="my-4 p-5 bg-purple-50 border border-purple-200 rounded-xl shadow-sm flex flex-col gap-3 animate-pulse">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
           <RefreshCw className="w-5 h-5 animate-spin" /> Processing Data...
        </h3>
        <p className="text-purple-800 text-sm">Applying AI transformations to the dataset.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="my-4 p-5 bg-red-50 border border-red-200 rounded-xl shadow-sm flex flex-col gap-3">
        <h3 className="font-semibold text-red-900 flex items-center gap-2">
           <AlertTriangle className="w-5 h-5" /> Transformation Failed
        </h3>
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-4 p-5 bg-white border border-green-200 rounded-xl shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100 shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">Spreadsheet Generated!</h3>
          <p className="text-xs text-gray-500">Your custom spreadsheet is ready to download.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Rows</p>
          <div className="flex items-center justify-between">
             <span className="font-semibold text-gray-800">{stats.newRows}</span>
             {stats.newRows !== stats.originalRows && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                  {stats.newRows > stats.originalRows ? '+' : ''}{stats.newRows - stats.originalRows}
                </span>
             )}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Columns</p>
          <div className="flex items-center justify-between">
             <span className="font-semibold text-gray-800">{stats.newCols}</span>
             {stats.newCols !== stats.originalCols && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                  {stats.newCols > stats.originalCols ? '+' : ''}{stats.newCols - stats.originalCols}
                </span>
             )}
          </div>
        </div>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
        <strong>Note:</strong> Download your file before refreshing the page, or the data will be lost.
      </p>

      {driveUrl && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm text-green-800 flex flex-col gap-2">
          <strong>✅ Saved to Google Drive!</strong>
          <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 underline flex items-center gap-1 font-medium">
            Open Spreadsheet <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-2 mt-1">
            <input 
              type="text" 
              readOnly 
              value={driveUrl} 
              className="flex-1 bg-white border border-green-200 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none focus:border-green-400"
              onClick={(e) => e.target.select()}
            />
            <button 
              onClick={() => navigator.clipboard.writeText(driveUrl)}
              className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              title="Copy link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-2 mt-2">
        <button onClick={handleDownloadExcel} className="flex-1 px-4 py-2 bg-brand-purple text-white text-sm font-medium rounded-lg hover:bg-[#4b33ab] transition-colors flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Excel (.xlsx)
        </button>
        <button onClick={handleDownloadCsv} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> CSV
        </button>
        <button 
          onClick={handleSaveToDrive} 
          disabled={isSavingDrive}
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSavingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-4 h-4" />}
          Save to Drive
        </button>
      </div>
    </div>
  );
};

function MainApp({ user }) {
  useEffect(() => {
    // Lock body/html scroll when MainApp (chat screen) is active to prevent mobile bouncing
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      // Restore previous styles when unmounted (e.g. going back to landing page)
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [datasets, setDatasets] = useState({});
  const activeDatasetName = Object.keys(datasets).length > 0 ? Object.keys(datasets)[Object.keys(datasets).length - 1] : null;
  const activeDataset = activeDatasetName ? datasets[activeDatasetName] : null;

  const setActiveDataset = (dataset) => {
    if (dataset) {
      setDatasets(prev => ({ ...prev, [dataset.name]: dataset }));
    } else {
      setDatasets({});
    }
  };

  const removeDataset = (name) => {
    setDatasets(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      let text = "";
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        text = await selectedFile.text();
      } else if (selectedFile.name.toLowerCase().match(/\.xlsx?$/)) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        text = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        text = await selectedFile.text();
      }
      
      const parsed = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: true });
      const { data: normalized, headerIndex } = normalizeData(parsed.data);
      const agg = computeAggregations(normalized);
      const sample = normalized.slice(0, 5);
      
      const datasetObj = { name: selectedFile.name, aggregations: agg, sample, fullData: normalized, headerIndex };
      setActiveDataset(datasetObj);
      
      const report = DataQualityAnalyzer.analyzeDataset(normalized);
      if (report) {
         setMessages(prev => [...prev, { role: 'system_component', type: 'data_quality_report', report }]);
      }
    } catch (e) {
      console.error("Error reading file", e);
      showAlert("Upload Error", "Failed to parse the file.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const [isDragging, setIsDragging] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [chatId, setChatIdState] = useState(null); // Document ID of the current chat in Firebase
  const chatIdRef = React.useRef(null);

  const setChatId = (id) => {
    chatIdRef.current = id;
    setChatIdState(id);
  };
  const [pendingInstruction, setPendingInstruction] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
     if (pendingInstruction && !loading) {
         const text = pendingInstruction;
         setPendingInstruction(null);
         handleSend(text, true);
     }
  }, [pendingInstruction, loading]);
  const [recentChats, setRecentChats] = useState([]);
  const [appAlert, setAppAlert] = useState(null);
  const fileInputRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

  const showAlert = (title, message) => setAppAlert({ title, message, isConfirm: false });
  const showConfirm = (title, message, onConfirm) => setAppAlert({ title, message, isConfirm: true, onConfirm });

  const computeAggregations = (data) => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0]);
    const agg = {};
    headers.forEach(h => {
      let sum = 0, count = 0, numeric = true;
      const frequencies = {};
      data.forEach(row => {
        const val = row[h];
        if (val !== null && val !== undefined && val !== '') {
           count++;
           if (typeof val === 'number') {
             sum += val;
           } else if (!isNaN(Number(val))) {
             sum += Number(val);
           } else {
             numeric = false;
           }
           const strVal = String(val);
           frequencies[strVal] = (frequencies[strVal] || 0) + 1;
        }
      });
      if (numeric && count > 0) {
        agg[h] = { type: 'numeric', sum, average: sum / count, count };
      } else {
        const topFreq = Object.entries(frequencies).sort((a,b)=>b[1]-a[1]).slice(0, 5);
        agg[h] = { type: 'categorical', uniqueCount: Object.keys(frequencies).length, topFrequencies: Object.fromEntries(topFreq), count };
      }
    });
    return agg;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!user) {
      setRecentChats([]);
      return;
    }
    
    // Explicitly reset states to guarantee a clean welcome screen on login
    setMessages([]);
    setChatId(null);
    chatIdRef.current = null;
    setDatasets({});
    setActiveDataset(null);
    setFile(null);

    const loadChats = async () => {
      try {
        const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const chats = [];
        querySnapshot.forEach((d) => {
          chats.push({ id: d.id, ...d.data() });
        });
        chats.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
          return timeB - timeA;
        });
        setRecentChats(chats.slice(0, 15));
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };
    loadChats();
  }, [user]);



  const loadChat = (chat) => {
    setChatId(chat.id);
    setMessages(chat.messages || []);
    if (chat.dataset) {
      setActiveDataset(chat.dataset);
      setFile({ 
         name: chat.dataset.name, 
         isGoogleSheet: chat.dataset.isGoogleSheet, 
         isPublicGoogleSheet: chat.dataset.isPublicGoogleSheet 
      });
    } else {
      setActiveDataset(null);
      setFile(null);
    }
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const findExistingChatForSheet = async (spreadsheetId) => {
    if (!user) return null;
    try {
      const q = query(
        collection(db, 'chats'),
        where('userId', '==', user.uid),
        where('dataset.spreadsheetId', '==', spreadsheetId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error("Error finding existing chat:", err);
    }
    return null;
  };

  const deleteChat = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Optimistic UI update
      setRecentChats(prev => prev.filter(c => c.id !== id));
      if (chatId === id) {
        setMessages([]);
        setActiveDataset(null);
        setChatId(null);
      }
      
      // Delete in background
      await deleteDoc(doc(db, 'chats', id));
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const clearAllChats = async () => {
    showConfirm(
      "Delete All Chats?",
      "Are you sure you want to delete all chats? This cannot be undone.",
      async () => {
        try {
          // Clear UI instantly
          setAppAlert(null);
          setRecentChats([]);
          setMessages([]);
          setActiveDataset(null);
          setChatId(null);

          // Fetch and delete ALL user chats in background
          const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const deletePromises = [];
          querySnapshot.forEach((d) => {
            deletePromises.push(deleteDoc(doc(db, 'chats', d.id)));
          });
          await Promise.all(deletePromises);
        } catch (err) {
          console.error("Failed to delete all chats", err);
          showAlert("Error", "Failed to delete all chats.");
        }
      }
    );
  };

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight;
    setShowScrollButton(bottom > 100);
  };

  const toggleListening = () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const normalizeData = (dataArray) => {
    if (!dataArray || dataArray.length < 2) return { data: [], headerIndex: 0 };
    
    let maxColIndex = -1;
    dataArray.forEach(row => {
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i] !== null && String(row[i]).trim() !== '') {
          if (i > maxColIndex) maxColIndex = i;
          break;
        }
      }
    });
    
    let headerIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, dataArray.length); i++) {
      const numCols = dataArray[i].filter(cell => cell !== null && String(cell).trim() !== '').length;
      if (numCols > maxCols) {
        maxCols = numCols;
        headerIndex = i;
      }
    }
    
    const rawHeaders = (dataArray[headerIndex] || []).slice(0, maxColIndex + 1);
    const uniqueHeaders = [];
    rawHeaders.forEach((h, i) => {
       let baseH = String(h || '').trim();
       if (!baseH) baseH = `Column_${i+1}`;
       let finalH = baseH;
       let counter = 1;
       while (uniqueHeaders.includes(finalH)) {
           finalH = `${baseH}_${counter}`;
           counter++;
       }
       uniqueHeaders.push(finalH);
    });

    const rows = dataArray.slice(headerIndex + 1).map((row, idx) => {
      const obj = {};
      uniqueHeaders.forEach((h, i) => {
        obj[h] = row[i] !== undefined && row[i] !== null ? row[i] : '';
      });
      obj._sheetRowNumber = headerIndex + idx + 2;
      return obj;
    });
    
    const filteredRows = rows.filter(row => Object.values(row).some(val => String(val).trim() !== ''));
    return { data: filteredRows, headerIndex };
  };

  const handleSend = async (overrideInput = null, skipUserMessage = false) => {
    if (loading) return;
    const textInput = typeof overrideInput === 'string' ? overrideInput : input;
    if (!textInput.trim() && !file && !skipUserMessage) return;

    let currentDataset = activeDataset;
    let currentMessages = messages;
    let currentChatId = chatIdRef.current || chatId;
    
    if (!skipUserMessage) {
       const userMsg = { role: 'user', content: textInput };
       currentMessages = [...currentMessages, userMsg];
       setMessages(currentMessages);
       setInput('');
       // Ensure textarea regains focus immediately after clearing input and resets height
       setTimeout(() => {
          const textarea = document.getElementById('chatbot-textarea');
          if (textarea) {
            textarea.focus();
            textarea.style.height = '44px';
          }
       }, 10);
    }
    setLoading(true);
    
    try {
    // Extract all unique Google Sheet IDs from the text
    const sheetMatches = Array.from(textInput.matchAll(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/g)).map(m => m[1]);
    const uniqueSheetIds = [...new Set(sheetMatches)];

    for (const spreadsheetId of uniqueSheetIds) {
      const alreadyLoaded = Object.values(datasets).some(ds => ds.isGoogleSheet && ds.spreadsheetId === spreadsheetId);
      if (!alreadyLoaded) {
        setLoading(true);
        try {
          const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
          const text = await res.text();
          if (!res.ok || text.trim().startsWith('<!DOCTYPE html>')) throw new Error("Private");

          const parsed = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: true });
          if (parsed.data.length < 2) throw new Error("Private");

          const { data: normalized, headerIndex } = normalizeData(parsed.data);
          const agg = computeAggregations(normalized);
          const sample = normalized.slice(0, 5);
          
          const datasetName = `Public Google Sheet (${spreadsheetId.substring(0, 5)})`;
          const currentDatasetObj = {
             name: datasetName,
             aggregations: agg,
             sample,
             fullData: normalized,
             headerIndex,
             isGoogleSheet: true,
             isPublicGoogleSheet: true,
             spreadsheetId,
             sheetName: 'Sheet1'
          };
          
          setDatasets(prev => ({ ...prev, [datasetName]: currentDatasetObj }));
          
          const existingChat = await findExistingChatForSheet(spreadsheetId);
          if (existingChat) {
             setChatId(existingChat.id);
             currentChatId = existingChat.id;
             currentMessages = existingChat.messages || [];
          }
        } catch (err) {
          setLoading(false);
          const actionObj = { action: "connect_sheet", spreadsheetId, resumeText: textInput };
          
          const authMsg = {
             role: 'ai',
             content: `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: actionObj })}\n\`\`\``
          };
          const newMessagesWithAuth = [...currentMessages, authMsg];
              
          if (sessionStorage.getItem('googleToken')) {
              // If they have a token, we don't show the auth_prompt yet. 
              // We just show the user message and call auth silently.
              setMessages(currentMessages);
              handleIncrementalAuth(actionObj);
              return;
          }
          
          setMessages(newMessagesWithAuth);
          
          if (user) {
            const targetId = chatIdRef.current || currentChatId;
            const chatData = {
              userId: user.uid,
              messages: newMessagesWithAuth,
              dataset: null,
              updatedAt: serverTimestamp()
            };
            
            if (targetId) {
              setRecentChats(prev => {
                const updated = { ...prev.find(c => c.id === targetId), messages: newMessagesWithAuth, updatedAt: new Date() };
                return [updated, ...prev.filter(c => c.id !== targetId)];
              });
              updateDoc(doc(db, 'chats', targetId), chatData).catch(console.error);
            } else {
              const chatDocRef = doc(collection(db, 'chats'));
              const newChatId = chatDocRef.id;
              setChatId(newChatId);
              
              const cleanedTextInput = textInput.replace(/https?:\/\/[^\s]+/g, '').trim();
              chatData.title = cleanedTextInput.length > 30 
                ? cleanedTextInput.substring(0, 30).trim() + '...' 
                : (cleanedTextInput || 'Spreadsheet Chat');
              const newChat = { id: newChatId, ...chatData, updatedAt: new Date() };
              setRecentChats(prev => [newChat, ...prev.filter(c => c.id !== newChatId)]);
              
              setDoc(chatDocRef, { ...chatData, createdAt: serverTimestamp() }).catch(err => {
                console.error("Failed to create doc in background", err);
              });
            }
          }
          setInput('');
          return; // Pause chat execution until authorized
        }
      }
    }

    if (file && file.isGoogleSheet) {
      // Legacy handling if 'file' holds a Google Sheet proxy object that failed silently
      // In this version, we probably don't even need this block since we handle it earlier, but keeping it safe.
    }

    const validDatasets = Object.values(datasets).filter(ds => !ds.failed);

      const userName = user?.displayName || user?.email?.split('@')[0] || "User";
      
      const systemInstruction = `You are DataGenie, an expert Data Analyst AI. 
RULES:
0. Address the user by their name in a friendly manner. The user's name is: ${userName}.
1. ALWAYS respond in the EXACT same language the user uses in their prompt.
2. If the user asks for predictions or future outcomes based on data, use your analytical reasoning to forecast and predict logically.
3. If the user asks to modify, filter, or create tabular data, output the result strictly in CSV format wrapped in a markdown code block (e.g., \`\`\`csv ... \`\`\`).
4. If the user asks for a chart/graph WITHOUT specifying the type, ASK them what type they want (e.g., Pie, Bar, or Line). Do NOT generate the chart until they specify.
5. If the user explicitly asks for a specific chart type (Pie, Bar, Line), you MUST output the chart data strictly as JSON wrapped in a markdown code block EXACTLY like this:
\`\`\`chart-spec
{ "type": "bar", "title": "Chart Title", "xKey": "Category", "yKey": "Value", "data": [ { "Category": "A", "Value": 10 } ] }
\`\`\`
Do NOT output CSV if a chart is requested. Aggregate the data logically into a max of 15 items suitable for a chart. IMPORTANT: If the dataset uses abbreviations, acronyms, or short codes for categories (e.g., "C + I"), you MUST expand them into their full, descriptive names in the chart data so new users can understand the definitions.
6. SCOPE OF TOPICS & DEVELOPER INFO:
   - If the user asks who developed, created, or built you, you must proudly answer that you were developed by SANTHOSH M, a Computer Science and Engineering (CSE) student at Chennai Institute of Technology, and share his LinkedIn profile: https://www.linkedin.com/in/santhosh-m-332962381/.
   - If the user asks a general question related to data analysis, statistics, Python/pandas, SQL, Excel, or working with data (even if it's not about their specifically connected dataset), answer it helpfully and directly, like a knowledgeable data analyst would. If they have a dataset loaded, you may also offer to demonstrate the answer using their actual data if relevant.
   - If the user asks a question COMPLETELY UNRELATED to data, analysis, or their dataset (e.g. general trivia, weather, personal advice, creative writing unrelated to data), politely decline and redirect them back to what you can help with — data analysis, filtering, visualization, and their connected datasets.
7. If the user asks you to ADD, UPDATE, DELETE, or SEARCH data in their connected Google Sheet, output a JSON block formatted EXACTLY like this:
\`\`\`sheet_action
{
  "action": "insert", // can be "insert", "update", "delete", or "search"
  "sheetName": "Sheet1",
  "data": { "Column Name": "Value" }, // For insert/update. Map user input semantically to exact column headers provided below.
  "match": { "Column Name": "Value" } // For update/delete/search to find the row.
}
\`\`\`
RULES FOR SHEET_ACTION:
- SEMANTIC MATCHING: Map natural language to the exact Header Name.
- MISSING INFO: If required fields are missing, ASK the user.
- AMBIGUITY: Clarify if multiple column headers match.
- SPREADSHEET LOOKUP & VERIFICATION RULES (CRITICAL):
  1. NEVER assume a value belongs to a particular column without checking. Search EVERY column in the provided 100-ROW DATA SAMPLE.
  2. IDENTIFY THE MATCHING ROW: Find exactly which row and actual column contains the value.
  3. SMART CASE-SENSITIVE SEARCH: Perform a case-insensitive search first. "Santhosh" and "santhosh" are potential matches.
  4. Case A (Exactly One Match): If the case-insensitive search finds exactly ONE row, automatically use that row regardless of capitalization. Execute immediately. Do NOT ask about capitalization unnecessarily.
  5. Case B (Multiple Matches): If multiple rows match (whether due to different capitalization like "Santhosh" vs "santhosh", or identical duplicates), DO NOT GUESS. Show identifying info and ask the user which row they mean.
  6. Case C (Not Found): Tell the user you couldn't find it. Do NOT output a sheet_action.
  7. UNIQUE MATCHING: If there are multiple matches and the user clarifies which one they want, use the '_sheetRowNumber' in your 'match' object (e.g. '{"match": {"_sheetRowNumber": 8}}') to unambiguously target the correct row.
  8. ALWAYS VERIFY FIRST: Never output 'match' criteria unless you have verified it exists in the data sample.
  9. INFER INTENT: If the user doesn't mention a column, infer the intended row by searching all columns for the value, then execute the action on the intended target column.
- DO NOT output any other markdown blocks if you are executing a sheet action.
8. If the user asks to switch to a different tab/sheet within the same Google Spreadsheet, output a JSON block formatted EXACTLY like this:
\`\`\`sheet_switch_tab
{ "sheetName": "New Tab Name" }
\`\`\`
DO NOT output any other text if you are switching tabs. Only switch to tabs that exist in the available tabs list.
9. If the user asks to transform, filter, clean, or generate an entirely NEW spreadsheet from the current one, you MUST write a Javascript function to do this against the full dataset. Output it EXACTLY like this:
\`\`\`transform_dataset
(data) => {
  // 'data' is an array of objects representing all rows. 
  // Write pure JS to filter, map, sort, or modify the data.
  // Return the new transformed array of objects.
  return data.filter(row => row.Department === 'CSE');
}
\`\`\`
10. If the user asks to filter, clean, extract, or do a complex structural change (like removing columns or multiple rows), you MUST write a Javascript function to do this against the full dataset.
- If they explicitly ask to do this in a "new spreadsheet" or "create a copy", output it EXACTLY like this:
\`\`\`auto_transform_copy
(data) => {
  return data.filter(row => row.Department === 'CSE');
}
\`\`\`
- If they ask to "edit", "remove", "update" the spreadsheet IN PLACE (without explicitly asking for a new copy), output it EXACTLY like this:
\`\`\`auto_transform_inplace
(data) => {
  return data.filter(row => row.Department === 'CSE');
}
\`\`\`
11. CRITICAL DIRECTIVE — DISTINGUISH ACTION REQUESTS FROM CODE QUESTIONS:
   - If the user asks you to ACTUALLY transform/filter/modify THEIR connected dataset (e.g. 'give only the first 10 rows', 'remove the last column', 'filter my data where...') AND a dataset is currently loaded, respond ONLY with the auto_transform_copy/auto_transform_inplace/transform_dataset code block as before.
   - If the user asks for CODE, an EXAMPLE, or HOW something is done in Python/pandas/SQL/Excel (e.g. 'give me the code for removing nulls', 'how do I filter rows in Python', 'show me a pandas example'), this is an educational request, NOT an action request — respond normally with an explanation and a code snippet in a regular \`\`\`python code block, even if no dataset is loaded. Do NOT attempt auto_transform_copy for these requests.
12. For Multi-file Joins: When generating a transformation function (e.g. \`\`\`transform_dataset\`), if you see multiple datasets in the context, output a function that takes a \`datasets\` dictionary object. Example:
\`\`\`transform_dataset
(datasets) => {
  const users = datasets['users.csv'].fullData;
  const purchases = datasets['purchases.csv'].fullData;
  // join logic...
  return joinedArray;
}
\`\`\`

${validDatasets.length > 0 ? `Here are the currently loaded datasets:
${validDatasets.map(ds => `
---
DATASET: ${ds.name}
ROWS: ${ds.fullData?.length}
${ds.availableTabs ? `AVAILABLE TABS: ${ds.availableTabs.join(', ')}` : ''}
PRECOMPUTED AGGREGATIONS: ${JSON.stringify(ds.aggregations)}
SAMPLE 5 ROWS (Use ONLY for schema reference, NEVER for row retrieval):
${JSON.stringify(ds.sample)}
---
`).join('\n')}
WARNING: The sample rows provided above are ONLY for schema reference. DO NOT attempt to manually read this sample and type out the rows in your response. If the user asks for rows or joins, you MUST write the Javascript code block to filter or join them. DO NOT summarize the sample!` : ''}`;

      let finalInput = textInput;
      let aiMessagesContext = messages.filter(m => m.role !== 'system_component');
      const textWithoutUrls = finalInput.replace(/https?:\/\/[^\s]+/g, '').trim();
      
      // Only trigger auto-transform if a dataset is loaded and there is actual text requesting it, not just a URL
      if (Object.keys(datasets).length > 0 && textWithoutUrls && /(sheet|spreadsheet|copy|first|filter|extract|remove|transform|update)/i.test(textWithoutUrls)) {
          const isMulti = Object.keys(datasets).length > 1;
          const multiInstruct = isMulti ? `\nSince there are multiple datasets loaded, your function MUST take a \`datasets\` dictionary object as a parameter (e.g. \`(datasets) => { ... }\`) and use it to combine/access data from the multiple sheets.` : '';
          finalInput = `Task: Write a JavaScript function to process the dataset based on this user request: "${textInput}".${multiInstruct}\n\nCRITICAL: You MUST output ONLY a single markdown code block labeled \`\`\`auto_transform_copy\`\`\` (if creating a new copy) OR \`\`\`auto_transform_inplace\`\`\` (if editing the existing sheet). DO NOT write ANY conversational text, summaries, or explanations. Just the code block.`;
          aiMessagesContext = []; // Wipe history for this request to prevent context poisoning from past failures
      }

      let aiText = "Sorry, I couldn't process that.";
      try {
        aiText = await generateAIResponse(systemInstruction, aiMessagesContext, finalInput);
      } catch (routerError) {
        if (routerError.message === "ALL_PROVIDERS_FAILED") {
          setShowQuotaModal(true);
          setLoading(false);
          return;
        } else {
          aiText = `API Error: ${routerError.message}`;
        }
      }

      // Forgive the LLM if it outputs a generic javascript code block containing a function
      aiText = aiText.replace(/```(?:javascript|js)\s*\n?(?=(?:\(.*?\)|[a-zA-Z0-9_]+)\s*=>|function\s*\()/gi, '```auto_transform_copy\n');

      if (aiText.includes('```sheet_action')) {
         const match = aiText.match(/```sheet_action\s*([\s\S]*?)\s*```/i);
         if (match && currentDataset?.isGoogleSheet) {
            try {
              const actionObj = JSON.parse(match[1]);
              const token = sessionStorage.getItem('googleToken');
              if (!token) {
                 aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: actionObj })}\n\`\`\``;
              } else {
                 const resultMsg = await SpreadsheetSchemaManager.execute(actionObj, currentDataset, token);
                 aiText += `\n\n*✅ ${resultMsg}* Click the Refresh button on the file chip to sync the latest data.`;
              }
            } catch (err) {
               if (err.message.includes("UNAUTHENTICATED") || err.message.toLowerCase().includes('scopes')) {
                  aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: actionObj })}\n\`\`\``;
               } else if (err.message.includes("PERMISSION_DENIED")) {
                  aiText = aiText.replace(/```sheet_action\s*[\s\S]*?\s*```/i, ''); // Remove the failing action
                  aiText += `\n\n*(You do not have edit access to this spreadsheet.)*`;
                  aiText += `\n\n\`\`\`copy_spreadsheet\n{ "reason": "You do not have edit access to this spreadsheet. Would you like me to create an editable copy in your Drive?" }\n\`\`\``;
               } else {
                  aiText += "\n\n*(Failed to execute sheet action: " + err.message + ")*";
               }
            }
         } else if (!currentDataset?.isGoogleSheet) {
            aiText += `\n\n*(DEBUG: AI outputted sheet_action but currentDataset is not a Google Sheet or is null. currentDataset: ${currentDataset ? 'exists' : 'null'})*`;
         } else if (!match) {
            aiText += `\n\n*(DEBUG: AI outputted sheet_action but regex match failed.)*`;
         }
      }

      if (aiText.includes('```sheet_switch_tab')) {
         const match = aiText.match(/```sheet_switch_tab\s*([\s\S]*?)\s*```/i);
         if (match && currentDataset?.isGoogleSheet) {
            try {
              const switchCmd = JSON.parse(match[1]);
              const newTab = switchCmd.sheetName;
              if (currentDataset.availableTabs?.includes(newTab) || true) {
                 await fetchSheetData(currentDataset.spreadsheetId, newTab, currentDataset.availableTabs);
                 aiText += `\n\n*✅ Successfully switched to the '${newTab}' tab!*`;
              }
            } catch (err) {
               aiText += "\n\n*(Failed to switch tabs: " + err.message + ")*";
            }
         }
      }



      if (aiText.includes('```auto_transform_copy') || aiText.includes('```auto_transform_inplace')) {
         const match = aiText.match(/```(auto_transform_copy|auto_transform_inplace)\s*([\s\S]*?)\s*```/i);
         if (match && currentDataset?.fullData) {
            try {
               const actionType = match[1].toLowerCase();
               const codeString = match[2];
               const token = sessionStorage.getItem('googleToken');
               if (!token) {
                  aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: { action: actionType, codeString } })}\n\`\`\``;
               } else {
                  let url;
                  let successMsg = "";
                  
                  if (actionType === 'auto_transform_inplace') {
                     try {
                        const resultData = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, codeString);
                        url = await SpreadsheetExportEngine.updateInPlace(resultData, token, currentDataset.spreadsheetId, currentDataset.sheetName, currentDataset.headerIndex);
                        successMsg = `*✅ Successfully updated the spreadsheet in-place!* [Open Spreadsheet](${url})`;
                     } catch (err) {
                        if (err.message === "PERMISSION_DENIED") {
                           const resultData = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, codeString);
                           const cleanName = currentDataset.name.replace(/\.[^/.]+$/, "");
                           url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, currentDataset.spreadsheetId, currentDataset.sheetName, currentDataset.headerIndex);
                           successMsg = `*✅ You didn't have edit access to the original, so I created a new filtered copy in your Google Drive!* [Open Spreadsheet](${url})`;
                        } else {
                           throw err;
                        }
                     }
                  } else {
                     if (codeString.match(/\(\s*datasets\s*\)/) || codeString.startsWith('datasets =>')) {
                         const resultData = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, codeString);
                         const cleanName = currentDataset.name.replace(/\.[^/.]+$/, "");
                         url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, currentDataset?.spreadsheetId, currentDataset?.sheetName, currentDataset?.headerIndex);
                     } else if (currentDataset.isGoogleSheet) {
                         url = await SpreadsheetSchemaManager.createFilteredCopy(currentDataset, codeString, token);
                     } else {
                         const resultData = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, codeString);
                         const cleanName = currentDataset.name.replace(/\.[^/.]+$/, "");
                         url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, currentDataset?.spreadsheetId, currentDataset?.sheetName, currentDataset?.headerIndex);
                     }
                     successMsg = `*✅ Successfully created a new filtered spreadsheet in your Google Drive!* [Open Spreadsheet](${url})`;
                  }
                  aiText += `\n\n${successMsg}`;
               }
            } catch (err) {
               if (err.message.includes("UNAUTHENTICATED") || err.message.toLowerCase().includes('scopes') || err.message.includes("PERMISSION_DENIED")) {
                  const actionType = match[1].toLowerCase();
                  aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: { action: actionType, codeString: match[2] } })}\n\`\`\``;
               } else {
                  aiText += "\n\n*(Failed to apply transform: " + err.message + ")*";
               }
            }
         } else if (!currentDataset?.fullData || !match) {
            console.warn('[auto_transform_copy] Failed - no dataset loaded or regex match failed', { currentDataset, aiText });
            aiText = "I tried to apply that directly to your data, but I don't see a dataset currently loaded. Could you upload or connect a file first? In the meantime, here's the general approach:\n\n" + aiText.replace(/```(auto_transform_copy|auto_transform_inplace)/gi, '```javascript');
         }
      }
      if (aiText.includes('```copy_spreadsheet')) {
         const match = aiText.match(/```copy_spreadsheet\s*([\s\S]*?)\s*```/i);
         if (match && currentDataset?.isGoogleSheet) {
            try {
               const token = sessionStorage.getItem('googleToken');
               if (!token) {
                  aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: { action: 'copy_spreadsheet', spreadsheetId: currentDataset.spreadsheetId } })}\n\`\`\``;
               } else {
                  const newSpreadsheetId = await SpreadsheetSchemaManager.copySpreadsheet(currentDataset.spreadsheetId, token);
                  const url = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`;
                  aiText += `\n\n*✅ Successfully created an exact copy of the spreadsheet in your Google Drive!* [Open Spreadsheet](${url})`;
               }
            } catch (err) {
               if (err.message.includes("UNAUTHENTICATED") || err.message.toLowerCase().includes('scopes') || err.message.includes("PERMISSION_DENIED")) {
                  aiText += `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction: { action: 'copy_spreadsheet', spreadsheetId: currentDataset.spreadsheetId } })}\n\`\`\``;
               } else {
                  aiText += "\n\n*(Failed to copy spreadsheet: " + err.message + ")*";
               }
            }
         }
      }
      
      // Clean up internal AI blocks before displaying/saving to prevent raw code from showing in chat
      const originalAiText = aiText;
      aiText = aiText.replace(/```(?:sheet_action|sheet_switch_tab|auto_transform_copy|auto_transform_inplace|copy_spreadsheet)\s*[\s\S]*?\s*```/gi, '').trim();

      if (!aiText && originalAiText) {
          aiText = `*(DEBUG: The AI action failed to execute or generate a valid response. Original AI output was:)*\n\n${originalAiText}`;
      }

      const finalMessages = [...currentMessages, { role: 'ai', content: aiText || "*(Empty Response)*" }];
      setMessages(finalMessages);
      setLoading(false); // Instantly turn off loading so it doesn't spin while saving to Firebase
      
      if (user) {
         const datasetForDb = currentDataset ? { ...currentDataset } : null;
         if (datasetForDb) delete datasetForDb.fullData;
         
         const targetId = chatIdRef.current || currentChatId;
         if (targetId) {
           // Update local recentChats state
           setRecentChats(prev => {
             const updated = { ...prev.find(c => c.id === targetId), messages: finalMessages, dataset: datasetForDb, updatedAt: new Date() };
             return [updated, ...prev.filter(c => c.id !== targetId)];
           });
           
           const chatData = {
              userId: user.uid,
              messages: finalMessages,
              dataset: datasetForDb,
              updatedAt: serverTimestamp()
           };
           updateDoc(doc(db, 'chats', targetId), chatData).catch(console.error);
         } else {
             const chatDocRef = doc(collection(db, 'chats'));
             const newChatId = chatDocRef.id;
             setChatId(newChatId);
             
             const firstUserMsg = finalMessages.find(m => m.role === 'user')?.content || '';
             const titleText = firstUserMsg.replace(/https?:\/\/[^\s]+/g, '').replace(/\[Attached File: .*\]/g, '').trim();
             const chatTitle = titleText 
               ? (titleText.length > 30 ? titleText.substring(0, 30).trim() + '...' : titleText)
               : (currentDataset && currentDataset.name !== "Public Google Sheet" ? currentDataset.name : 'Spreadsheet Chat');

             const chatData = {
                userId: user.uid,
                title: chatTitle,
                messages: finalMessages,
                dataset: datasetForDb,
                updatedAt: serverTimestamp()
             };
             
             const newChat = { id: newChatId, ...chatData, updatedAt: new Date() };
             setRecentChats(prev => [newChat, ...prev.filter(c => c.id !== newChatId)]);
             
             setDoc(chatDocRef, { ...chatData, createdAt: serverTimestamp() }).catch(err => {
               console.error("Failed to create doc in background", err);
             });

             // Background title generation using AI based on first user message and first AI reply
             const generateBackgroundTitle = async () => {
               try {
                 const titleInstruction = "Generate a short, specific 3-6 word title summarizing this conversation. Output ONLY the title text, no quotes, no punctuation at the end, nothing else.";
                 const firstUserMsgObj = finalMessages.find(m => m.role === 'user');
                 const firstAiMsgObj = finalMessages.find(m => m.role === 'ai');
                 if (firstUserMsgObj && firstAiMsgObj) {
                   const generatedTitleRaw = await generateAIResponse(titleInstruction, [], `User: ${firstUserMsgObj.content}\nAssistant: ${firstAiMsgObj.content}`);
                   let cleanTitle = generatedTitleRaw ? generatedTitleRaw.trim() : '';
                   cleanTitle = cleanTitle.replace(/^["'“”`]+|["'“”`]+$/g, '').trim();
                   if (cleanTitle.endsWith('.')) {
                     cleanTitle = cleanTitle.substring(0, cleanTitle.length - 1).trim();
                   }
                   if (cleanTitle) {
                     updateDoc(doc(db, 'chats', newChatId), { title: cleanTitle }).catch(console.error);
                     setRecentChats(prev => {
                       return prev.map(c => c.id === newChatId ? { ...c, title: cleanTitle } : c);
                     });
                   }
                 }
               } catch (err) {
                 console.warn("Failed to generate AI title in background", err);
               }
             };
             generateBackgroundTitle();
         }
      }
      setFile(null); // Clear file after sending
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: "Error communicating with AI. Check console." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementalAuth = async (pendingAction) => {
    let isAuthError = false;
    try {
      const token = await getGoogleToken();
      if (token) {
        // Execute pending action!
        if (pendingAction && pendingAction.action === 'connect_sheet') {
           setLoading(true);
           try {
              let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${pendingAction.spreadsheetId}`, {
                 headers: { Authorization: `Bearer ${token}` }
              });
              
              if (!res.ok && (res.status === 401 || res.status === 403)) {
                 const refreshedToken = await getGoogleToken(true);
                 res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${pendingAction.spreadsheetId}`, {
                    headers: { Authorization: `Bearer ${refreshedToken}` }
                 });
              }

              const data = await res.json();
              if (data.error) throw new Error(data.error.message);
              
              const availableTabs = data.sheets ? data.sheets.map(s => s.properties.title) : ['Sheet1'];
              const firstTab = availableTabs[0];
              
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                  let newContent = lastMsg.content.replace(/```auth_prompt[\s\S]*?```/, '');
                  if (!newContent.includes('✅ Google Sheets access granted!')) {
                     newContent += `\n\n*✅ Google Sheets access granted! Loading your data...*`;
                  }
                  lastMsg.content = newContent;
                }
                return newMsgs;
              });
              
              await fetchSheetData(pendingAction.spreadsheetId, firstTab, availableTabs);
              
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                  lastMsg.content = lastMsg.content.replace('Loading your data...', 'Loaded successfully!*');
                }
                return newMsgs;
              });
              
           } catch (execErr) {
              const errorMsg = execErr.message;
              if (errorMsg.includes("insufficient authentication scopes") || errorMsg.includes("PERMISSION_DENIED")) {
                 isAuthError = true;
                 sessionStorage.removeItem('googleToken');
                 showAlert("Permission Denied", "Google blocked the request because you didn't grant the necessary permissions. The Authorize button will now appear in your chat. Please click it, and MAKE SURE TO CHECK THE BOXES to allow DataGenie to access and edit your spreadsheets!");
              } else {
                 showAlert("Error", "Failed to connect to sheet: " + errorMsg);
              }
              
              setDatasets(prev => ({ 
                 ...prev, 
                 [`Failed Sheet (${pendingAction.spreadsheetId.substring(0,5)})`]: { 
                    isGoogleSheet: true, 
                    spreadsheetId: pendingAction.spreadsheetId, 
                    failed: true 
                 } 
              }));

              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai' && lastMsg.content.includes('Loading your data...')) {
                  lastMsg.content = lastMsg.content.replace('Loading your data...', `Failed to load: ${execErr.message}*`);
                }
                
                if (errorMsg.includes("insufficient authentication scopes") || errorMsg.includes("PERMISSION_DENIED")) {
                   newMsgs.push({
                      role: 'ai',
                      content: `\n\n\`\`\`auth_prompt\n${JSON.stringify({ pendingAction })}\n\`\`\``
                   });
                }
                return newMsgs;
              });
           } finally {
              if (pendingAction && pendingAction.resumeText && !isAuthError) {
                  setPendingInstruction(pendingAction.resumeText);
              }
              setLoading(false);
           }
         } else if (pendingAction && (pendingAction.action === 'auto_transform_copy' || pendingAction.action === 'auto_transform_inplace') && activeDataset) {
           setLoading(true);
           try {
              const resultData = SpreadsheetExportEngine.executeTransformation(datasets, activeDatasetName, pendingAction.codeString);
              let url;
              let successMsg = "";
              
              if (pendingAction.action === 'auto_transform_inplace') {
                 try {
                    url = await SpreadsheetExportEngine.updateInPlace(resultData, token, activeDataset.spreadsheetId, activeDataset.sheetName, activeDataset.headerIndex);
                    successMsg = `*✅ Successfully updated the spreadsheet in-place!* [Open Spreadsheet](${url})`;
                 } catch (err) {
                    if (err.message === "PERMISSION_DENIED") {
                       // Fall back to creating a copy
                       const cleanName = activeDataset.name.replace(/\.[^/.]+$/, "");
                       url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, activeDataset.spreadsheetId, activeDataset.sheetName, activeDataset.headerIndex);
                       successMsg = `*✅ You didn't have edit access to the original, so I created a new filtered copy in your Google Drive!* [Open Spreadsheet](${url})`;
                    } else {
                       throw err;
                    }
                 }
              } else {
                 const cleanName = activeDataset.name.replace(/\.[^/.]+$/, "");
                 url = await SpreadsheetExportEngine.saveToGoogleDrive(resultData, `${cleanName} - Processed`, token, activeDataset.spreadsheetId, activeDataset.sheetName, activeDataset.headerIndex);
                 successMsg = `*✅ Successfully created a new filtered spreadsheet in your Google Drive!* [Open Spreadsheet](${url})`;
              }
              
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                  lastMsg.content = lastMsg.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n${successMsg}`;
                }
                return newMsgs;
              });
              
              if (chatId) {
                const chatRef = doc(db, 'chats', chatId);
                getDoc(chatRef).then(docSnap => {
                   if (docSnap.exists()) {
                     const msgs = docSnap.data().messages;
                     const l = msgs[msgs.length - 1];
                     if (l && l.role === 'ai') {
                       l.content = l.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n${successMsg}`;
                       updateDoc(chatRef, { messages: msgs }).catch(console.error);
                     }
                   }
                }).catch(console.error);
              }
           } catch (execErr) {
              const errorMsg = execErr.message;
              if (errorMsg.includes("insufficient authentication scopes") || errorMsg.includes("PERMISSION_DENIED")) {
                 sessionStorage.removeItem('googleToken');
                 showAlert("Permission Denied", "Google blocked the request because you didn't grant the necessary permissions. The Authorize button will now appear in your chat. Please click it, and MAKE SURE TO CHECK THE BOXES to allow DataGenie to access and edit your spreadsheets!");
              } else {
                 showAlert("Error", "Failed to create filtered copy: " + errorMsg);
              }
           } finally {
              setLoading(false);
           }
        } else if (pendingAction && pendingAction.action === 'copy_spreadsheet') {
           setLoading(true);
           try {
              const newSpreadsheetId = await SpreadsheetSchemaManager.copySpreadsheet(pendingAction.spreadsheetId, token);
              const url = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`;
              
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                  lastMsg.content = lastMsg.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n*✅ Successfully created an exact copy of the spreadsheet in your Google Drive!* [Open Spreadsheet](${url})`;
                }
                return newMsgs;
              });
              
              if (chatId) {
                const chatRef = doc(db, 'chats', chatId);
                getDoc(chatRef).then(docSnap => {
                   if (docSnap.exists()) {
                     const msgs = docSnap.data().messages;
                     const l = msgs[msgs.length - 1];
                     if (l && l.role === 'ai') {
                       l.content = l.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n*✅ Successfully created an exact copy of the spreadsheet in your Google Drive!* [Open Spreadsheet](${url})`;
                       updateDoc(chatRef, { messages: msgs }).catch(console.error);
                     }
                   }
                }).catch(console.error);
              }
           } catch (execErr) {
              const errorMsg = execErr.message;
              if (errorMsg.includes("insufficient authentication scopes") || errorMsg.includes("PERMISSION_DENIED")) {
                 sessionStorage.removeItem('googleToken');
                 showAlert("Permission Denied", "Google blocked the request because you didn't grant the necessary permissions. The Authorize button will now appear in your chat. Please click it, and MAKE SURE TO CHECK THE BOXES to allow DataGenie to access and edit your spreadsheets!");
              } else {
                 showAlert("Error", "Failed to copy spreadsheet: " + errorMsg);
              }
           } finally {
              setLoading(false);
           }
        } else if (pendingAction && activeDataset) {
           setLoading(true);
           try {
              const resultMsg = await SpreadsheetSchemaManager.execute(pendingAction, activeDataset, token);
              
              // Find the last AI message containing the auth_prompt and append success message
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                  lastMsg.content = lastMsg.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n*✅ Google Sheets editing has been enabled successfully. ${resultMsg}* Click the Refresh button on the file chip to sync the latest data.`;
                }
                return newMsgs;
              });
              
              // Also update database
              if (chatId) {
                const chatRef = doc(db, 'chats', chatId);
                getDoc(chatRef).then(docSnap => {
                   if (docSnap.exists()) {
                     const msgs = docSnap.data().messages;
                     const l = msgs[msgs.length - 1];
                     if (l && l.role === 'ai') {
                       l.content = l.content.replace(/```auth_prompt[\s\S]*?```/, '') + `\n\n*✅ Google Sheets editing has been enabled successfully. ${resultMsg}*`;
                       updateDoc(chatRef, { messages: msgs }).catch(console.error);
                     }
                   }
                }).catch(console.error);
              }
           } catch (execErr) {
              showAlert("Error", "Failed to execute pending action: " + execErr.message);
           } finally {
              setLoading(false);
           }
        }
      } else {
        showAlert("Connection Failed", "Google did not provide an access token.");
      }
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
         showAlert("Error", "Spreadsheet editing cannot be enabled until Google Sheets permission is granted.");
      }
    }
  };


  const fetchSheetData = async (spreadsheetId, sheetName, availableTabs = []) => {
    let token = sessionStorage.getItem('googleToken');
    setLoading(true);
    try {
      if (!token) token = await getGoogleToken();
      
      let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok && (res.status === 401 || res.status === 403)) {
        token = await getGoogleToken(true);
        res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error && errData.error.message) {
          throw new Error(`Google API Error: ${errData.error.message}`);
        }
        throw new Error("Failed to fetch sheet data.");
      }
      const data = await res.json();
      if (!data.values || data.values.length < 2) {
        throw new Error("Sheet is empty or has no data rows.");
      }
      
      const { data: normalized, headerIndex } = normalizeData(data.values);
      
      const agg = computeAggregations(normalized);
      const sample = normalized.slice(0, 5);
      
      const uniqueName = `${sheetName} (${spreadsheetId.substring(0, 5)})`;
      
      setActiveDataset({
        name: uniqueName,
        aggregations: agg,
        sample: sample,
        fullData: normalized,
        headerIndex: headerIndex,
        isGoogleSheet: true,
        spreadsheetId,
        sheetName,
        availableTabs
      });
      setFile({ name: `${sheetName}`, isGoogleSheet: true });
      
      const report = DataQualityAnalyzer.analyzeDataset(normalized);
      
      const existingChat = await findExistingChatForSheet(spreadsheetId);
      if (existingChat) {
        setChatId(existingChat.id);
        const msgs = existingChat.messages || [];
        if (report && !msgs.some(m => m.type === 'data_quality_report')) {
           setMessages([...msgs, { role: 'system_component', type: 'data_quality_report', report }]);
        } else {
           setMessages(msgs);
        }
      } else {
        if (report) {
           setMessages(prev => [...prev, { role: 'system_component', type: 'data_quality_report', report }]);
        }
      }
    } catch (err) {
      showAlert("Import Error", err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(```(?:csv|chartdata|auth_prompt|transform_dataset|form_analysis|memory_update|copy_spreadsheet)[\s\S]*?```)/gi);
    return parts.map((part, idx) => {
      if (part.toLowerCase().startsWith('```csv') && part.endsWith('```')) {
        const csvData = part.replace(/^```csv\n?/i, '').replace(/\n?```$/, '');
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const rows = csvData.trim().split('\n');
        const parsedRows = rows.map(row => {
          const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          return matches.map(m => m.replace(/^"|"$/g, '').trim());
        });

        return (
          <div key={idx} className="my-4 flex flex-col gap-3">
            <div className="overflow-x-auto max-h-64 border border-gray-200 rounded-xl bg-white shadow-sm custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    {parsedRows[0]?.map((cell, i) => (
                      <th key={i} className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedRows.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-bg-card border border-white/5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-secondary/10 rounded-lg flex items-center justify-center border border-accent-secondary/20 shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-accent-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Generated Data</p>
                  <p className="text-xs text-gray-400">Ready to download</p>
                </div>
              </div>
              <a href={url} download="datagenie_output.csv" className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-bold rounded-lg hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download CSV
              </a>
            </div>
          </div>
        );
      } else if (part.toLowerCase().startsWith('```chart-spec') && part.endsWith('```')) {
        const jsonDataStr = part.replace(/^```chart-spec\n?/i, '').replace(/\n?```$/, '');
        try {
          const chartData = JSON.parse(jsonDataStr);
          if (chartData.type && chartData.data) {
             // Cap data at 200 rows to prevent rendering crashes
             const safeData = {
               ...chartData,
               data: chartData.data.slice(0, 200)
             };
             return <ChartWidget key={idx} chartSpec={safeData} />;
          }
        } catch(e) {
           return (
             <div key={idx} className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto text-sm font-mono text-gray-700 whitespace-pre-wrap">
               {part}
             </div>
           );
        }
      } else if (part.toLowerCase().startsWith('```auth_prompt') && part.endsWith('```')) {
        const jsonDataStr = part.replace(/^```auth_prompt\n?/i, '').replace(/\n?```$/, '');
        try {
          const authData = JSON.parse(jsonDataStr);
          return (
            <div key={idx} className="my-4 p-5 bg-bg-card border border-accent-primary/30 rounded-xl shadow-sm flex flex-col gap-3">
              <h3 className="font-semibold text-accent-primary flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Spreadsheet Editing
              </h3>
              <p className="text-gray-300 text-sm">Additional Google permission is required to edit your spreadsheets.</p>
              
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-3 text-xs leading-relaxed">
                <strong className="text-amber-400 block mb-1">Authorization Notice:</strong>
                Since this app is in development mode, Google may show a "Google hasn't verified this app" warning. 
                To proceed, click <strong>"Advanced"</strong> and then click the <strong>"Go to talktomydata (unsafe)"</strong> link at the bottom.
              </div>

              <button 
                onClick={() => handleIncrementalAuth(authData.pendingAction)}
                disabled={loading}
                className="self-start mt-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg transition-colors shadow-sm border border-white/10 disabled:opacity-50"
              >
                Authorize Google Sheets
              </button>
            </div>
          );
        } catch(e) {
           return null;
        }
      } else if (part.toLowerCase().startsWith('```transform_dataset') && part.endsWith('```')) {
        const codeString = part.replace(/^```transform_dataset\n?/i, '').replace(/\n?```$/, '');
        return <TransformationWidget key={idx} codeString={codeString} datasets={datasets} activeDatasetName={activeDatasetName} />;
      }
      return (
        <div key={idx} className="markdown-body text-[14.5px] leading-relaxed break-words">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-3 last:mb-0 whitespace-pre-wrap" {...props} />,
              a: ({node, ...props}) => <a className="text-accent-secondary hover:text-[#67E8F9] hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-white drop-shadow-sm" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mb-3 mt-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mb-3 mt-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-base font-bold text-white mb-2 mt-3" {...props} />,
              code: ({node, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <code className="block bg-black/40 p-3 rounded-xl overflow-x-auto text-[13px] font-mono mb-3 border border-white/10 shadow-inner" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="bg-black/30 text-accent-secondary px-1.5 py-0.5 rounded text-[13px] font-mono border border-white/10" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({node, ...props}) => <pre className="bg-transparent m-0 p-0" {...props} />,
              table: ({node, ...props}) => <div className="overflow-x-auto mb-3 rounded-xl border border-white/10"><table className="w-full text-sm text-left border-collapse bg-black/20" {...props} /></div>,
              th: ({node, ...props}) => <th className="px-4 py-3 bg-white/5 border-b border-white/10 font-semibold text-white" {...props} />,
              td: ({node, ...props}) => <td className="px-4 py-3 border-b border-white/5" {...props} />
            }}
          >
            {part}
          </ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <div 
      className="fixed inset-0 flex h-dvh bg-bg-main font-sans text-white selection:bg-accent-primary/30 overflow-hidden"
      onDragEnter={(e) => {
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {messages.length === 0 && <MouseGlow />}
      
      {/* Drag & Drop Overlay */}
      <AnimatePresence>
      {isDragging && (
        <motion.div 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
          className="fixed inset-0 z-[200] bg-bg-main/90 backdrop-blur-xl flex flex-col items-center justify-center border-[8px] border-dashed border-accent-primary/50 shadow-[inset_0_0_100px_rgba(139,92,246,0.2)]"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const droppedFile = e.dataTransfer.files[0];
              setFile(droppedFile);
              handleFileSelect(droppedFile);
            }
          }}
        >
          <motion.div 
            animate={{ 
              y: [0, -20, 0], 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-gradient-to-br from-accent-primary to-accent-secondary p-8 rounded-full shadow-[0_0_50px_rgba(139,92,246,0.5)] mb-8 border border-white/20"
          >
            <Upload className="w-24 h-24 text-white drop-shadow-md" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight drop-shadow-md"
          >
            Drop it like it's hot!
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-300 font-medium text-lg md:text-xl max-w-md text-center"
          >
            Release your CSV or Excel file anywhere on the screen to instantly attach it.
          </motion.p>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div id="app-sidebar" className="fixed inset-y-0 left-0 z-50 md:relative md:z-auto w-[260px] bg-bg-panel/90 backdrop-blur-xl flex-shrink-0 flex flex-col justify-between h-full border-r border-white/10 shadow-xl animate-fade-in md:animate-none">
          <div className="flex flex-col p-3 pb-0">
            <div className="flex items-center justify-between mb-4">
              <button aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 md:hover:text-white md:hover:bg-white/10 rounded-lg transition-colors">
                <SidebarIcon className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-sm font-medium text-gray-300">
              <div 
                onClick={() => {
                  setMessages([]);
                  setActiveDataset(null);
                  setDatasets({});
                  setFile(null);
                  setChatId(null);
                  setLoading(false);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-3 bg-white/5 md:hover:bg-white/10 md:hover:text-white md:hover:scale-[1.02] active:scale-95 rounded-xl cursor-pointer transition-all duration-300 font-bold shadow-md shadow-black/20 border border-white/5 group"
              >
                <div className="bg-gradient-to-br from-accent-primary to-accent-secondary text-white p-1.5 rounded-lg shadow-sm md:group-hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4" />
                </div>
                New chat
              </div>
            </nav>

            {Object.keys(datasets).length > 0 && (
              <div className="mt-4 flex flex-col gap-2 px-2 shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Files</h3>
                <div className="flex flex-col gap-1.5 mt-1">
                  {Object.values(datasets).map(ds => (
                    <div key={ds.name} className="flex items-center justify-between px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300">
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-accent-secondary shrink-0" />
                        <span className="truncate font-medium max-w-[120px]" title={ds.name}>{ds.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {ds.isGoogleSheet && (
                          <>
                            <button 
                              aria-label="Refresh sheet data"
                              onClick={() => fetchSheetData(ds.spreadsheetId, ds.sheetName)} 
                              className="text-gray-500 hover:text-accent-secondary p-1 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <a 
                              href={`https://docs.google.com/spreadsheets/d/${ds.spreadsheetId}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-accent-secondary p-1 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                        <button 
                          onClick={() => removeDataset(ds.name)}
                          className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                          aria-label="Remove dataset"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recents</h3>
                {recentChats.length > 0 && (
                  <button onClick={clearAllChats} className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider">
                    Clear All
                  </button>
                )}
              </div>
              <nav className="flex flex-col text-sm text-gray-400">
                {recentChats.length === 0 ? (
                  <div className="px-2 py-2 text-gray-600 italic text-xs">No recent chats.</div>
                ) : (
                  recentChats.map(chat => {
                    // Filter out auth prompts and system messages to get a true count of user/AI interaction
                    const trueMsgCount = (chat.messages || []).filter(m => m.role === 'user' || (m.role === 'ai' && !m.content.includes('```auth_prompt'))).length;
                    return (
                    <div 
                      key={chat.id} 
                      onClick={() => loadChat(chat)}
                      className={`px-2 py-2 flex items-center justify-between rounded-lg cursor-pointer transition-colors text-xs group ${chatId === chat.id ? 'bg-chat-active/20 text-chat-active-text font-semibold border border-chat-active/30' : 'md:hover:bg-white/5'}`}
                    >
                      <span className="truncate pr-2 flex-1">{chat.title}</span>
                      <div className="flex items-center shrink-0">
                        <button 
                          aria-label="Delete chat"
                          onClick={(e) => deleteChat(chat.id, e)} 
                          className={`text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-white/10 opacity-100 ${chatId === chat.id ? 'text-chat-active-text' : ''}`}
                          title="Delete chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )})
                )}
              </nav>
            </div>
          </div>

          <div className="p-3 border-t border-white/5 bg-bg-main/50 backdrop-blur-md">
            <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg shadow-accent-primary/20">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium text-gray-200 truncate">{user?.email || 'User'}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="text-xs font-medium text-gray-500 hover:text-red-400 px-2 py-1 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        <ChatbotWidget 
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
          handleShare={handleShare} copied={copied}
          messages={messages} loading={loading}
          messagesEndRef={messagesEndRef}
          showScrollButton={showScrollButton} scrollToBottom={scrollToBottom}
          datasets={datasets} fetchSheetData={fetchSheetData} removeDataset={removeDataset}
          fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} file={file}
          input={input} setInput={setInput}
          handleSend={handleSend}
          handleStop={() => setLoading(false)}
          toggleListening={toggleListening} isListening={isListening}
          showQuotaModal={showQuotaModal} setShowQuotaModal={setShowQuotaModal}
          appAlert={appAlert} setAppAlert={setAppAlert}
          renderMessageContent={renderMessageContent}
          DataQualityCard={DataQualityCard}
        />
      </Suspense>
    </div>
  );
}

const LoadingSpinner = () => (
  <div className="flex h-dvh w-full items-center justify-center bg-bg-main">
    <svg className="animate-spin h-10 w-10 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const Sparkles = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
)

function MouseGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Hide if hovering over the chat input area, sidebar, or any input/button
      const target = e.target;
      if (target && (target.closest('#chatbox-input-area') || target.closest('#app-sidebar') || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      className={`hidden md:block fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: `radial-gradient(60px circle at ${position.x}px ${position.y}px, rgba(34, 211, 238, 0.15), transparent 80%)`
      }}
    />
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Caught in AppErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh w-full flex-col items-center justify-center bg-bg-main text-white p-8 overflow-y-auto">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl w-full max-w-3xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Application Error
            </h1>
            <p className="mb-4 text-gray-300">The application encountered an unexpected error. Please report this to the developer.</p>
            <div className="bg-black/40 p-4 rounded-xl overflow-x-auto">
              <pre className="text-red-300 text-sm font-mono whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (user) return (
    <AppErrorBoundary>
      <MainApp user={user} />
    </AppErrorBoundary>
  );
  
  if (showLanding) return (
    <Suspense fallback={<LoadingSpinner />}>
      <LandingPage onGetStarted={() => setShowLanding(false)} />
    </Suspense>
  );
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignUpPage onAuthSuccess={() => {}} />
    </Suspense>
  );
}

export default App;
