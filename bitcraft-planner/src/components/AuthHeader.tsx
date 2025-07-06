import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';
import { DataManager } from './DataManager';

export const AuthHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-5xl font-bold text-blue-600">
        BitCraft Calculator
      </h1>
      
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={() => setShowDataManager(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              title="Manage your saved data"
            >
              💾 Data
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <DataManager 
        isOpen={showDataManager} 
        onClose={() => setShowDataManager(false)} 
      />
    </div>
  );
}; 