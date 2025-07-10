import React from 'react';
import { SaveStatus } from '../services/firebaseService';

interface SaveStatusIndicatorProps {
  saveStatus: SaveStatus;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ saveStatus }) => {
  const { isSaving, isLoading, lastSaved, error } = saveStatus;

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-40 flex items-center">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-sm">Loading your data...</span>
      </div>
    );
  }

  if (error) {
    const isDbNotAvailable = error.includes('Database not available');
    const isDatabaseSetupError = error.includes('enable Firestore');
    
    return (
      <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-40 max-w-sm ${
        isDbNotAvailable || isDatabaseSetupError ? 'bg-yellow-500' : 'bg-red-500'
      } text-white`}>
        <div className="text-sm font-semibold">
          {isDbNotAvailable ? '⚠️ Database Offline' : isDatabaseSetupError ? '⚠️ Database Setup Required' : '❌ Error'}
        </div>
        <div className="text-xs mt-1">
          {isDatabaseSetupError ? 'Enable Firestore in Firebase Console' : error}
        </div>
        {(isDbNotAvailable || isDatabaseSetupError) && (
          <div className="text-xs mt-1 opacity-90">
            App works normally, data saved locally
          </div>
        )}
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-40 flex items-center">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-sm">Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="fixed top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-md shadow-md z-40 text-xs">
        ✅ Saved {lastSaved.toLocaleTimeString()}
      </div>
    );
  }

  return null;
}; 