import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send } from 'lucide-react';

const getBotResponse = (message) => {
  const msg = message.toLowerCase();
  if (msg.includes('forgot') || msg.includes('reset') || msg.includes('password')) {
    return "If you've forgotten your password, you can use the 'Forgot password?' link on the login screen. You'll be able to reset it via an OTP sent to your registered email.";
  }
  if (msg.includes('login') || msg.includes('sign in') || msg.includes('access')) {
    return "To log in, please make sure you have selected the correct role (Employee or Admin) and entered your correct ID, email, and password. If you continue to have issues, try resetting your password.";
  }
  if (msg.includes('signup') || msg.includes('create') || msg.includes('register')) {
    return "You can create a new employee account by clicking the 'Create account' link at the bottom of the login page. Please note, only employee accounts can be created through self-signup.";
  }
  if (msg.includes('admin')) {
    return "Admin accounts are created by the system administrator and cannot be created through the public signup page. Please contact your IT department for admin access.";
  }
  return "I can assist with questions about logging in, signing up, or resetting your password. For other issues, please use the 'Contact' tab to submit a support ticket.";
};

export default function LoginSupportChat() {
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      sender: 'bot',
      text: 'Hello! I am a specialized bot. How can I help you with login or signup issues today?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const botText = getBotResponse(inputText);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[450px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'bot' && (
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-lg'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-lg border border-slate-200 dark:border-slate-700'
              }`}
            >
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-slate-500" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-lg text-xs text-slate-400 animate-pulse font-mono border border-slate-200 dark:border-slate-700">
              Bot is typing...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about login or signup..."
          className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}