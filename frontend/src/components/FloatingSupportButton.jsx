import React from 'react';
import { HelpCircle } from 'lucide-react';

const FloatingSupportButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors duration-200 flex items-center justify-center"
      title="Customer Support"
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
};

export default FloatingSupportButton;