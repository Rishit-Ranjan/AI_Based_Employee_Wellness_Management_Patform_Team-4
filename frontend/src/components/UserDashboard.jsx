import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lightbulb, Bot, X, LogOut, UploadCloud,
  Dumbbell, Apple, Brain, Clock, HeartPulse, Sparkles, Check, ShieldAlert, AlertCircle, Smile, Send,
  CalendarCheck, Siren, Receipt, ShieldCheck, Target, FileDown, Utensils, Bell, ExternalLink, PlayCircle,
  Mic, MicOff, Volume2, Sun, Moon, Activity, Trash2, Menu, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import ProfileEditModal from './ProfileEditModal';
import { CheckupSchedulerModule, EmergencySOSModule, ExpenseTrackerModule } from './ExtraWellnessModules';
import InsuranceModule from './InsuranceModule';
import VideoPlayerModal from './VideoPlayerModal';
import DietPlanModule from './DietPlanModule';
import GoalsModule from './GoalsModule'; // Assuming this is a local component
import ReportsModule from './ReportsModule';
import NotificationBell from './NotificationBell';
import { sendAiChatMessage, fetchAiInsights, generateAiRoutine } from '../services/api';

import PersonalWellnessProfile from './wellness/PersonalWellnessProfile';
import ThemeToggle from './wellness/ThemeToggle';
import logo from '../assets/logo.png';

// Export UserProfileModule for backwards compatibility & modularity
export function UserProfileModule(props) {
  return <PersonalWellnessProfile {...props} />;
}

// ==========================================
// MODULE 3: PERSONALIZED RECOMMENDATIONS
// ==========================================
export function RecommendationModule({ recommendations, loading = false, onPlayVideo }) {
  const getSeverityStyles = (severity) => {
    if (severity === 'High') return { iconColor: 'text-red-500 dark:text-red-400', borderColor: 'border-red-200 dark:border-red-800', bgColor: 'bg-red-50 dark:bg-red-950/60' };
    if (severity === 'Medium') return { iconColor: 'text-amber-500 dark:text-amber-400', borderColor: 'border-amber-200 dark:border-amber-800', bgColor: 'bg-amber-50 dark:bg-amber-950/60' };
    return { iconColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-100 dark:border-blue-800', bgColor: 'bg-blue-50 dark:bg-blue-950/60' };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-full" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-5/6" />
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
              <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-700/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {recommendations && recommendations.length > 0 ? (
        recommendations.map((rec) => {
          const Icon = rec.category === 'Fitness' ? Dumbbell :
                       rec.category === 'Diet' ? Apple :
                       rec.category === 'Mental Wellness' ? Brain :
                       rec.category === 'Yoga' ? HeartPulse : Clock;
          
          const { iconColor, borderColor, bgColor } = getSeverityStyles(rec.severity);

          return (
            <div key={rec.id} className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all duration-300 shadow-sm overflow-hidden">
              {rec.imageUrl && (
                <div className="relative h-40">
                  <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {rec.videoUrl && (
                    <button 
                      onClick={() => onPlayVideo(rec.videoUrl, rec.category, rec.severity)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-all"
                    >
                      <PlayCircle className="w-8 h-8" />
                    </button>
                  )}
                </div>
              )}

              <div className="p-5 flex flex-col flex-grow space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 ${bgColor} border ${borderColor} rounded-xl ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-3 py-0.5 ${bgColor} border ${borderColor} ${iconColor} text-[10px] font-bold uppercase rounded-lg font-mono`}>
                    {rec.category}
                  </span>
                </div>

                <div>
                  <h4 className="text-[17px] font-display font-semibold text-base text-slate-900 dark:text-slate-100">{rec.title}</h4>
                  <p className=" text-slate-500 dark:text-slate-400 text-[15px] mt-1.5 leading-relaxed font-light">
                    {rec.description}
                  </p>
                </div>
              </div>

              <div className="flex-grow" />

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${rec.severity === 'High' ? 'bg-red-500' : rec.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">{rec.severity} Severity</span>
                </div>
                {rec.videoUrl && (
                  <a href={rec.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                    Watch on YouTube
                  </a>
                )}
              </div>

              {rec.reasons && rec.reasons.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <p className="text-[12.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">Why this is recommended for you:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    {rec.reasons.map((reason, i) => (
                      <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mt-4">All Clear!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No specific wellness recommendations are needed at this time. Keep up the great work!</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODULE 6: AI WELLNESS CHATBOT
// ==========================================
export function ChatbotModule({ user, isFloating = false, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        setIsVoiceInput(true);
        setTimeout(() => {
          handleSendWithText(transcript);
        }, 300);
      };

      recognitionRef.current.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  const speakText = useCallback((text) => {
    if (!isSpeechEnabled || !speechSynthRef.current) return;
    speechSynthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = speechSynthRef.current.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira'));
    if (femaleVoice) utterance.voice = femaleVoice;
    speechSynthRef.current.speak(utterance);
  }, [isSpeechEnabled]);

  useEffect(() => {
    // Load messages from localStorage on mount
    const savedMessages = localStorage.getItem(`chat_messages_${user.employeeId}`);
    if (savedMessages && JSON.parse(savedMessages).length > 0) {
      setMessages(JSON.parse(savedMessages));
    } else {
      // If no saved messages, set the initial greeting
      const greeting = `Hello ${user.name}! I am InfyWell, your AI Wellness Assistant. Ask me anything about exercise schedules, diet rules, stress management, or how to reduce workplace burnout!`;
      setMessages([
        { id: '1', sender: 'bot', text: greeting, model: 'System Message', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }

// The AI model name is configured server-side via the AI_MODEL_NAME
    // environment variable, so no client-side model-name fetching is needed here.
  }, [user.employeeId, user.name]);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    // Only save if there's more than just the initial greeting
    if (messages.length > 1) {
      localStorage.setItem(`chat_messages_${user.employeeId}`, JSON.stringify(messages));
    }
  }, [messages, user.employeeId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition failed:', err);
        setIsListening(false);
      }
    }
  };

  const handleSendWithText = async (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    
try { // Pass '' for aiModelName so the backend uses the env-configured AI_MODEL_NAME
      const data = await sendAiChatMessage(user.employeeId, text.trim(), selectedModel, '');
      const botText = data.response || data.reply || data.message || "I'm here to support your health & wellness journey.";

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
        model: data.model, // Store the model name
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(botText);
    } catch (err) {
      console.error("AI Chatbot error:", err);
      const fallbackMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I am having trouble connecting to the backend right now. Please try again shortly.",
        model: 'System Error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    handleSendWithText(inputText);
  };

  const handleClearChat = () => {
    // Clear from localStorage
    localStorage.removeItem(`chat_messages_${user.employeeId}`);
    // Reset state to initial greeting
    const greeting = `Hello ${user.name}! I am InfyWell, your AI Wellness Assistant. Ask me anything about exercise schedules, diet rules, stress management, or how to reduce workplace burnout!`;
    setMessages([
      { id: '1', sender: 'bot', text: greeting, model: 'System Message', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-800 ${isFloating ? '' : 'border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm'}`}>
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xxs font-bold text-slate-800 dark:text-slate-100 font-sans">
                InfyWell
              </span>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 -mt-0.5">AI Assistant</div>
            </div>
          </div>
          {isFloating && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all"
              title="Close Chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isFloating && (
          <div className="w-full border-t border-slate-200 dark:border-slate-700 mt-3" />
        )}
        <div className="flex items-center justify-end mt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-700 transition-all"
              title="Clear Chat History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${isSpeechEnabled ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
              title={isSpeechEnabled ? "Voice Output Active" : "Voice Output Muted"}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-600'
              }`}
            >
              <p>{m.text}</p>
              <span className={`flex items-center justify-end gap-2 text-[9px] mt-1.5 font-mono ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                {m.sender === 'bot' && m.model && (
                  <span className="px-1.5 py-0.5 bg-black/10 dark:bg-black/20 rounded-sm">{m.model}</span>
                )}
                <span>{m.timestamp}</span>
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none text-xs text-slate-400 animate-pulse font-mono">
              InfyWell is thinking...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-900">
<div className="flex flex-col w-full gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
            </select>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask your AI assistant..."}
              className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800'
              }`}
              title="Voice Command"
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// MODULE 14: AI WELLNESS ASSISTANT DASHBOARD
// ==========================================
export function WellnessCoachDashboard({ user, healthRecords = [] }) {
  const [insights, setInsights] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  useEffect(() => {
    const loadInsights = async () => {
      setLoadingInsights(true);
      try {
        const data = await fetchAiInsights(user.employeeId);
        setInsights(data);
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        setInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    };
    loadInsights();
  }, [user.employeeId]);

  const handleGenerateRoutine = async () => {
    setLoadingRoutine(true);
    setRoutine(null);
    try {
      const data = await generateAiRoutine(user.employeeId);
      setRoutine(data);
    } catch (err) {
      console.error('Failed to generate AI routine:', err);
      setRoutine(null);
    } finally {
      setLoadingRoutine(false);
    }
  };

  const userRecord = healthRecords.find(r => r.employeeId === user.employeeId);
  const sleepVal = userRecord?.sleepHoursPerNight || 7.5;

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">Sleep Score</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{insights?.sleepScore || Math.min(100, Math.round(sleepVal * 11))}%</span>
            <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${insights?.sleepScore || Math.min(100, Math.round(sleepVal * 11))}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">Stress Index</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{insights?.stressIndex || 42}%</span>
            <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${insights?.stressIndex || 42}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">Activity Level</span>
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{insights?.activityLevel || 'Active'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">Based on weekly fitness logs</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">Nutrition</span>
            <Apple className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{insights?.nutritionQuality || 'Balanced'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">Diet quality index</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-800/90 border border-blue-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">AI Daily Wellness Tip</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-light">
            {loadingInsights ? 'Loading your personalized tip...' : (insights?.dailyTip || 'Take 5 minutes between sprint tasks for deep diaphragmatic breathing to stabilize blood pressure.')}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-800/90 border border-emerald-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">This Week's Target Goal</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-light">
            {loadingInsights ? 'Setting your weekly goal...' : (insights?.weeklyGoal || 'Aim for 10,000 daily steps and complete 4 days of cardio workout routines.')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">AI-Generated Daily Routine</h3>
          </div>
          <button
            onClick={handleGenerateRoutine}
            disabled={loadingRoutine}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loadingRoutine ? 'Generating...' : 'Generate New Routine'}
          </button>
        </div>

        {routine ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">Morning</h4>
              </div>
              <ul className="space-y-2">
                {routine.morning?.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-sky-500" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">Afternoon</h4>
              </div>
              <ul className="space-y-2">
                {routine.afternoon?.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">Evening</h4>
              </div>
              <ul className="space-y-2">
                {routine.evening?.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 font-mono text-xs">
            Click "Generate New Routine" for an AI-customized daily routine.
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// NEW COMPONENT: FLOATING ROBOT ASSISTANT
// ==========================================
const FloatingBot = ({ onClick, isChatOpen }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [bubbleText, setBubbleText] = useState('Click me!');
  const botRef = useRef(null);

  const bubbleMessages = useMemo(() => [
    "Hey there! How can I assist you today?",
    "My name's InfyWell",
    "Let's chat!",
    "Need some wellness tips?",
    "How are you feeling today?",
    "Why aren't you paying attention to me?",
  ], []);

  useEffect(() => {
    if (isChatOpen) return;

    const idleActions = [
      () => { // Show bubble
        setIsPaused(true);
        setBubbleText(bubbleMessages[Math.floor(Math.random() * bubbleMessages.length)]);
        setTimeout(() => setIsPaused(false), 4000);
      },
      () => { // Wave
        setIsWaving(true);
        setTimeout(() => setIsWaving(false), 2500); // Wave for 2.5s
      },
    ];

    const idleInterval = setInterval(() => {
      idleActions[Math.floor(Math.random() * idleActions.length)]();
    }, 8000); // Trigger a random idle action every 8 seconds

    return () => {
      clearInterval(idleInterval);
    };
  }, [isChatOpen, bubbleMessages]);

  return (
    <div
      ref={botRef}
      onClick={onClick}
      className="fixed bottom-4 right-6 z-50 cursor-pointer"
      title="Toggle AI Assistant"
    >
      {!isChatOpen && (
        <div 
          className={`absolute bottom-[105%] right-0 w-max max-w-[180px] sm:max-w-[220px] whitespace-normal break-words px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-[11px] font-semibold shadow-lg transition-opacity duration-300 ${
            isPaused ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {bubbleText}
          
          {/* Arrow pointing down toward the center of the head (40px in) */}
          <div 
            className="absolute -bottom-1.5 right-9 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-slate-700"
          />
        </div>
      )}

      {/* overflow="visible" remains to prevent clipping */}
      <svg 
        width="70"
        height="100" 
        viewBox="0 0 80 120" 
        overflow="visible"
        xmlns="http://www.w3.org/2000/svg" 
        className="drop-shadow-lg transition-transform"
        style={{ transform: `scaleX(-1)` }}
      >
        <style>
          {`
            /* Floating hover animation */
            .bot-body { animation: ${!isPaused && !isChatOpen && !isWaving ? 'bob 2s infinite ease-in-out' : 'none'}; }
            
            /* 
              Using absolute SVG coordinates for transform-origin to bypass Safari/browser bugs.
              Left Arm X = 12 + (8/2) = 16px. Y = 48 + 4 = 52px.
              Right Arm X = 60 + (8/2) = 64px. Y = 48 + 4 = 52px.
            */
            .bot-arm.left { 
              animation: ${isWaving ? 'wave-left 2.5s ease-in-out' : 'none'}; 
              transform-origin: 16px 52px; 
            }
            .bot-arm.right { 
              animation: ${isWaving ? 'wave-right 2.5s ease-in-out' : 'none'}; 
              transform-origin: 64px 52px; 
            }

            @keyframes bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }

            @keyframes wave-left {
              0% { transform: rotate(0deg); }
              15% { transform: rotate(-140deg); } /* lift up */
              30% { transform: rotate(-100deg); } /* wave in */
              45% { transform: rotate(-140deg); } /* wave out */
              60% { transform: rotate(-100deg); } /* wave in */
              75% { transform: rotate(-140deg); } /* wave out */
              100% { transform: rotate(0deg); }   /* back down */
            }

            @keyframes wave-right {
              0% { transform: rotate(0deg); }
              15% { transform: rotate(140deg); }  /* lift up */
              30% { transform: rotate(100deg); }  /* wave in */
              45% { transform: rotate(140deg); }  /* wave out */
              60% { transform: rotate(100deg); }  /* wave in */
              75% { transform: rotate(140deg); }  /* wave out */
              100% { transform: rotate(0deg); }   /* back down */
            }
          `}
        </style>
        <g className="bot-body">
          {/* Head */}
          <rect x="25" y="20" width="30" height="25" rx="6" fill="#a5b4fc" />
          <rect x="30" y="28" width="20" height="10" rx="3" fill="#1e293b" />
          <circle cx="36" cy="33" r="2" fill="#4ade80" />
          <circle cx="44" cy="33" r="2" fill="#4ade80" />
          <line x1="35" y1="20" x2="35" y2="15" stroke="#a5b4fc" strokeWidth="2" />
          <circle cx="35" cy="14" r="2" fill="#818cf8" />
          
          {/* Body */}
          <rect x="20" y="45" width="40" height="35" rx="8" fill="#4f46e5" />
          <circle cx="40" cy="62" r="8" fill="#312e81" />
          
          {/* Arms */}
          <rect className="bot-arm left" x="12" y="48" width="8" height="28" rx="4" fill="#6366f1" />
          <rect className="bot-arm right" x="60" y="48" width="8" height="28" rx="4" fill="#6366f1" />
        </g>
        
        {/* Legs (Placed inside bot-body so they float with the rest of the body) */}
        <g className="bot-body">
          <rect className="bot-leg left" x="25" y="80" width="10" height="35" rx="5" fill="#4338ca" />
          <rect className="bot-leg right" x="45" y="80" width="10" height="35" rx="5" fill="#4338ca" />
        </g>
      </svg>
    </div>
  );
};


// ==========================================
// CORE COMPONENT: USER DASHBOARD
// ==========================================
export default function UserDashboard({
  user,
  onLogout,
  healthRecords = [],
  risks = [],
  onAddRecord,
  onUpdateUserRecord,
  dailyHabits = [],
  onAddDailyHabit,
  onUpdateDailyHabit,
  mentalHealthLogs = [],
  onAddHealthRecord,
  onAddMentalHealthLog,
  onUpdateMentalHealthLog,
  onUpdateSentimentPulse,
  recommendations = [],
  loading = false,
  isProfileModalOpen,
  setIsProfileModalOpen,
  onUpdateAvatar,
  onUserUpdate
}) {
  // Initialize activeTab from localStorage, default to 7 if not found
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('userActiveTab');
    return savedTab ? parseInt(savedTab, 10) : 7;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for interactive chatbot icon
  useEffect(() => {
    localStorage.setItem('userActiveTab', activeTab.toString());
  }, [activeTab]);
  const [pupilTransform, setPupilTransform] = useState('');
  const chatButtonRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!chatButtonRef.current) return;

      const rect = chatButtonRef.current.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      const anchorY = rect.top + rect.height / 2;

      const deltaX = e.clientX - anchorX;
      const deltaY = e.clientY - anchorY;

      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 100) / 100;

      // Max pupil movement radius inside the SVG's viewBox
      const maxPupilMovement = 0.5;

      const pupilX = Math.cos(angle) * maxPupilMovement * distance;
      const pupilY = Math.sin(angle) * maxPupilMovement * distance;

      setPupilTransform(`translate(${pupilX} ${pupilY})`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);



  const [playingVideo, setPlayingVideo] = useState(null); // { url, category, severity }
  const userRecommendations = useMemo(() => {
    const recs = recommendations || [];
    
    // 1. If there is no data at all, return empty
    if (recs.length === 0) return [];
    
    // 2. If the data is nested by employeeId (Admin/Group fetch)
    if (recs[0]?.employeeId) {
        return recs.find(rec => rec.employeeId === user?.employeeId)?.recommendations || [];
    }
    
    // 3. If the backend already returns a flat array of recommendations for this user
    return recs;
  }, [recommendations, user]);

  // Handler: opens video modal with metadata for auto-fallback
  const handlePlayVideo = useCallback((videoUrl, category, severity) => {
    if (videoUrl) {
      setPlayingVideo({ url: videoUrl, category, severity });
    }
  }, []);

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const firstName = user?.name ? user.name.split(' ')[0] : 'Sudip';

  const navTabs = [
    { id: 7, label: 'My Wellness Profile', icon: User, desc: 'Health vitals & personalized trackers' },
    { id: 3, label: 'Personalized Recommender', icon: Lightbulb, desc: 'Fitness, diet & wellness routines' },
    { id: 14, label: 'AI Wellness Assistant', icon: Brain, desc: 'Daily AI insights & routine engine' },
    { id: 8, label: 'My Insurance', icon: ShieldCheck, desc: 'Coverage details & file claims' },
    { id: 9, label: 'Diet Plans', icon: Utensils, desc: 'AI-generated meal schedules' },
    { id: 10, label: 'My Goals', icon: Target, desc: 'Track achievements & badges' },
    { id: 11, label: 'Health Reports', icon: FileDown, desc: 'PDF downloads & history log' },
    { id: 12, label: 'Checkups & SOS', icon: CalendarCheck, desc: 'Schedule checkups & SOS' },
    { id: 13, label: 'Expenses', icon: Receipt, desc: 'Track health expense claims' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <VideoPlayerModal 
            videoUrl={playingVideo.url} 
            category={playingVideo.category}
            riskLabel={playingVideo.severity}
            onClose={() => setPlayingVideo(null)} 
          />
        )}
      </AnimatePresence>
      
      {/* 1. Header with Page Icon, Greeting, Date & Dark Mode Toggle */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700 px-4 md:px-8 py-3.5 flex items-center justify-between transition-colors">
        
        {/* Left: Mobile Menu Toggle & App Logo / Greeting */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="App Logo" className="w-15 h-14" />
            <div className="hidden sm:block">
              <span className="font-display font-bold text-base tracking-tight block text-slate-900 dark:text-slate-50 leading-none">
                Employee Wellness Management Analytics
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono uppercase tracking-widest font-semibold mt-1 block">
                Wellness Intelligence
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* User Greeting & Date Header */}
          <div className="hidden md:block">
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {getGreeting()}, {firstName} 👋
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-blue-500" />
              {currentDateFormatted}
            </p>
          </div>
        </div>

        {/* Right: Actions, ThemeToggle, Notification Bell, User Avatar & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <NotificationBell user={user} />

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* User Profile Info Trigger */}
          <div
            className="flex items-center gap-3 cursor-pointer group p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
            onClick={() => setIsProfileModalOpen(true)}
            title="Edit Profile"
          >
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">
                {user.name}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                {user.employeeId}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-mono font-bold rounded uppercase tracking-widest leading-none">
                Employee
              </span>
            </div>

            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 shadow-md object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl transition-all duration-200 cursor-pointer shadow-sm text-xs font-semibold"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <ProfileEditModal
          user={user}
          isAdmin={false}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdated={(updatedUser) => {
            if (updatedUser) onUserUpdate(updatedUser);
            if (updatedUser) {
              localStorage.setItem('wellness_current_user', JSON.stringify(updatedUser));
            }
            setIsProfileModalOpen(false);
          }}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* 2. Desktop Navigation Sidebar */}
        <aside
          className={`hidden lg:flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-700 transition-all duration-300 shrink-0 p-4 justify-between ${
            isSidebarCollapsed ? 'w-20' : 'w-70'
          }`}
        >
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              {!isSidebarCollapsed && (
                <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Modules Navigation
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <nav className="space-y-1.5">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left p-4 rounded-lg flex items-start gap-3 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 border-transparent text-slate-500'
                    }`}
                      >
                        <Icon className={`w-5.5 h-5.5 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && (
                      <div className="truncate">
                              <div className="text-[12px] font-semibold">{tab.label}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {tab.desc}
                              </div>
                        </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {!isSidebarCollapsed && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">System Vitals</span>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Analytics Active
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Drawer Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-72 bg-white dark:bg-slate-900 h-full p-5 space-y-4 shadow-2xl flex flex-col justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Wellness Modules
                      </span>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="space-y-1.5">
                    {navTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full text-left p-4 rounded-lg flex items-start gap-4 transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-900 font-semibold'
                              : 'hover:bg-slate-50 border-transparent text-slate-500'
                          }`}
                        >
                            <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <div className="truncate">
                              <div className="text-[11px] font-semibold">{tab.label}</div>
                            </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full py-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Main Workspace Canvas Stage */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-0">
          {/* Active module title header */}
          <div className="mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 rounded-md text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono mb-2">
                {activeTab === 7 ? 'SaaS Portal' : activeTab === 3 ? 'AI Recommender' : activeTab === 14 ? 'AI Coach' : activeTab === 8 ? 'Insurance' : activeTab === 9 ? 'Nutrition' : activeTab === 10 ? 'Goals' : activeTab === 11 ? 'Reports' : activeTab === 12 ? 'Emergency' : 'Financial'}
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                {activeTab === 7 && 'My Personal Wellness Profile'}
                {activeTab === 3 && 'Personalized Wellness Recommender'}
                {activeTab === 14 && 'AI Wellness Assistant'}
                {activeTab === 8 && 'Insurance Coverage & Claims'}
                {activeTab === 9 && 'AI Meal & Diet Plans'}
                {activeTab === 10 && 'My Goals & Achievements'}
                {activeTab === 11 && 'Health Reports & Timeline'}
                {activeTab === 12 && 'Checkups & Emergency SOS'}
                {activeTab === 13 && 'Health Expenses Tracker'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-2xl font-light">
                {activeTab === 7 && 'Track health vitals, monitor diagnostics analytics, daily hydration, steps, mood, and stress.'}
                {activeTab === 3 && 'Tailored, evidence-based fitness routines, diet schedules, and mental wellbeing recommendations.'}
                {activeTab === 14 && 'AI-powered daily wellness insights, personalized routines, and intelligent coaching.'}
                {activeTab === 8 && 'View your current insurance policy, coverage details, and file health claims.'}
                {activeTab === 9 && 'Personalized meal plans generated by AI based on your health profile.'}
                {activeTab === 10 && 'Track your wellness goals, achievements, and earn recognition badges.'}
                {activeTab === 11 && 'Download health reports as PDF and view your complete history.'}
                {activeTab === 12 && 'Schedule health checkups and trigger emergency SOS alerts.'}
                {activeTab === 13 && 'Track and manage your health-related expenses.'}
              </p>
            </div>
          </div>

          {/* Active Tab View */}
          <div>
            {activeTab === 7 && (
              <UserProfileModule
                user={user}
                records={healthRecords}
                risks={risks}
                dailyHabits={dailyHabits}
                onAddDailyHabit={onAddDailyHabit}
                onUpdateDailyHabit={onUpdateDailyHabit}
                mentalHealthLogs={mentalHealthLogs}
                onAddRecord={onAddRecord || onAddHealthRecord}
                onAddMentalHealthLog={onAddMentalHealthLog}
                onUpdateMentalHealthLog={onUpdateMentalHealthLog}
                onUpdateRecord={onUpdateUserRecord}
                onAddSentimentPulse={onUpdateSentimentPulse}
              />
            )}

            {activeTab === 3 && (
              <RecommendationModule recommendations={userRecommendations} loading={loading} onPlayVideo={handlePlayVideo} />
            )}

            {activeTab === 8 && (
              <InsuranceModule user={user} />
            )}

            {activeTab === 9 && (
              <DietPlanModule user={user} />
            )}

            {activeTab === 10 && (
              <GoalsModule user={user} />
            )}

            {activeTab === 11 && (
              <ReportsModule user={user} healthRecords={healthRecords} />
            )}

            {activeTab === 12 && (
              <div className="space-y-6">
                <CheckupSchedulerModule user={user} />
                <EmergencySOSModule user={user} />
              </div>
            )}

            {activeTab === 13 && (
              <ExpenseTrackerModule user={user} />
            )}

            {activeTab === 14 && (
              <WellnessCoachDashboard user={user} healthRecords={healthRecords} />
            )}
          </div>
        </main>
      </div>

      {/* AI Chat Assistant & Robot - MOVED OUTSIDE of overflow-hidden parent */}
      <FloatingBot onClick={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[390px] max-w-[calc(100vw-2rem)] h-[525px] shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex flex-col transition-all duration-300 animate-fadeIn">
          <ChatbotModule user={user} isFloating={true} onClose={() => setIsChatOpen(false)} />
        </div>
      )}
    </div>
  );
}
