import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService({ onNavigate }) {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 p-8 shadow-xl">
        <button
          onClick={() => onNavigate('signup')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign Up
        </button>
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <div className="prose prose-slate max-w-none text-sm text-slate-600">
          <p className="lead">Last updated: July 26, 2024</p>
          <p>
            Please read these terms and conditions carefully before using Our Service.
          </p>

          <h2>1. Acknowledgment</h2>
          <p>
            These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service. Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions.
          </p>

          <h2>2. User Accounts</h2>
          <p>
            When You create an account with Us, You must provide Us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service. You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password.
          </p>

          <h2>3. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding Content provided by You or other users), features and functionality are and will remain the exclusive property of the Company and its licensors.
          </p>

          <h2>4. Termination</h2>
          <p>
            We may terminate or suspend Your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions. Upon termination, Your right to use the Service will cease immediately.
          </p>

          <h2>5. Governing Law</h2>
          <p>
            The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.
          </p>
        </div>
      </div>
    </div>
  );
}