import React from 'react';
import { SaveStatus } from '../services/firebaseService';

interface SaveStatusIndicatorProps {
  saveStatus: SaveStatus;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ saveStatus }) => {
  const { isSaving, isLoading, lastSaved, error } = saveStatus;

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="bc-card px-4 py-2 shadow-soft flex items-center">
          <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm">Loading your data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isDbNotAvailable = error.includes('Database not available');
    const isDatabaseSetupError = error.includes('enable Firestore');
    
    return (
      <div className="fixed top-4 right-4 z-40 max-w-sm">
        <div className={`bc-card px-4 py-3 shadow-soft ${
          isDbNotAvailable || isDatabaseSetupError ? 'border-yellow-300' : 'border-red-300'
        }`}>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>{isDbNotAvailable ? '⚠️' : '❌'}</span>
            <span>
              {isDbNotAvailable ? 'Database Offline' : isDatabaseSetupError ? 'Database Setup Required' : 'Error'}
            </span>
          </div>
          <div className="text-xs mt-1">
            {isDatabaseSetupError ? 'Enable Firestore in Firebase Console' : error}
          </div>
          {(isDbNotAvailable || isDatabaseSetupError) && (
            <div className="text-xs mt-1 opacity-80">
              App works normally, data saved locally
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="bc-card px-4 py-2 shadow-soft flex items-center">
          <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm">Saving...</span>
        </div>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="bc-card px-3 py-1 shadow-soft text-xs">
          ✅ Saved {lastSaved.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return null;
}; 