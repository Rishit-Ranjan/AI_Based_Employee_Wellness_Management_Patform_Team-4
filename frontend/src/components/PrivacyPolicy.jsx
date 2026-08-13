import React from 'react';
import { X, Check, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrivacyPolicy({ onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => onNavigate('signup')} // Close on backdrop click
    >
      <motion.div
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -20, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Privacy Policy</h2>
          <button
            onClick={() => onNavigate('signup')} // Close button
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 prose prose-slate max-w-none text-sm text-slate-600 dark:text-slate-300">
          <p className="lead">Last updated: August 13, 2024</p>
          <p>
            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            While using Our Service, We may ask You to provide Us with and We may collect the following types of information:
          </p>
          <ul>
            <li><strong>Personal Identification Information:</strong> Name, email address, Employee ID.</li>
            <li><strong>Health and Wellness Data:</strong> Health vitals (BMI, blood pressure), daily habits (sleep, exercise, water intake), mental health logs (mood, stress scores), and wellness goals.</li>
            <li><strong>Usage Data:</strong> Interactions with the AI chatbot, feature usage, and session information. This data is used to improve the service.</li>
            <li><strong>Anonymized Data:</strong> Aggregated and anonymized data, such as department-level stress scores and sentiment, may be used for organizational analytics. Your personal identity will not be linked to this aggregated data.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>
            The Company may use Your Personal and Health Data for the following purposes:
          </p>
          <ul>
            <li>To provide and maintain our Service, including personalized recommendations, AI-generated insights, and diet plans.</li>
            <li>To manage Your Account and your registration as a user of the Service.</li>
            <li>To allow administrators to review and process insurance claims, appointments, and emergency SOS alerts.</li>
            <li>To provide administrators with anonymized, high-level analytics to monitor overall workforce wellbeing.</li>
            <li>To improve our AI models and services. All data used for training is anonymized.</li>
          </ul>

          <h2>3. Data Security and Retention</h2>
          <p>
            The security of Your Personal Data is important to Us. We use industry-standard measures to protect your information. We will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy or as required by law.
          </p>

          <h2>4. Your Data Rights</h2>
          <p>
            You have the right to access, update, or request deletion of your personal information. You can manage most of your data directly through your profile and health tracking modules. For other requests, please contact support.
          </p>

          <h2>5. Changes to this Privacy Policy</h2>
          <p>
            We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page and, if the changes are significant, through a platform notification.
          </p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={() => onNavigate('signup')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Decline
          </button>
          <button onClick={() => onNavigate('signup')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Accept & Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
