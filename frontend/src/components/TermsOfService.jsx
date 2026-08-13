import React from 'react';
import { X, Check, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TermsOfService({ onNavigate }) {
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
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Terms of Service</h2>
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
            Please read these terms and conditions carefully before using Our Service.
          </p>

          <h2>1. Acknowledgment</h2>
          <p>
            These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service. Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions.
          </p>

          <h2>2. Disclaimer: Not Medical Advice</h2>
          <p>
            The AI Wellness Assistant, recommendations, diet plans, and other information provided by the Service are for informational and educational purposes only. They are not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            When You create an account with Us, You must provide Us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service. You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password.
          </p>

          <h2>4. Use of the Service</h2>
          <p>
            You agree to use the Service only for its intended purpose of managing and improving your personal wellness. You are responsible for the accuracy of the health data you provide. The Service may not be used for any illegal or unauthorized purpose.
          </p>

          <h2>5. Termination</h2>
          <p>
            We may terminate or suspend Your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions. Upon termination, Your right to use the Service will cease immediately.
          </p>

          <h2>6. Governing Law</h2>
          <p>
            The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.
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
