import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy({ onNavigate }) {
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
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none text-sm text-slate-600">
          <p className="lead">Last updated: July 26, 2024</p>
          <p>
            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
          </p>

          <h2>1. Information Collection and Use</h2>
          <p>
            While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. This may include, but is not limited to: Email address, First name and last name, Health and wellness data.
          </p>

          <h2>2. Use of Your Personal Data</h2>
          <p>
            The Company may use Personal Data for the following purposes:
          </p>
          <ul>
            <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
            <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
            <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
            <li>To provide You with news, special offers and general information about other goods, services and events which we offer.</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>
            The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.
          </p>

          <h2>4. Retention of Your Personal Data</h2>
          <p>
            The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations.
          </p>

          <h2>5. Changes to this Privacy Policy</h2>
          <p>
            We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.
          </p>
        </div>
      </div>
    </div>
  );
}