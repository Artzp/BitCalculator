import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';
import { DataManager } from './DataManager';
import { UserProfile } from './UserProfile';
import { SettlementV2Service } from '../services/settlementV2Service';
import { getAuthUserDisplayName } from '../utils/userUtils';

export const AuthHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userProfileData, setUserProfileData] = useState<any>(null);

  // Debug: Log user data to console
  React.useEffect(() => {
    if (user) {
      console.log('👤 User data:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        providerData: user.providerData
      });
    }
  }, [user]);

  // Load user profile data for username display
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          const settlementService = new SettlementV2Service();
          const profile = await settlementService.getUser(user.uid);
          setUserProfileData(profile);
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      } else {
        setUserProfileData(null);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDiscordClick = () => {
    window.open('https://discord.gg/trDnZVXd', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-5xl font-bold text-blue-600">
        BitCraft Calculator
      </h1>
      
      <div className="flex items-center space-x-4">
        {/* Discord Support Button - Always visible */}
        <button
          onClick={handleDiscordClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          title="Join our Discord community for support, bug reports, feature requests, and discussions"
        >
          <span>💬</span>
          <span>Discord Support</span>
        </button>

        {user ? (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <div>Welcome, <span className="font-semibold">{userProfileData?.username || userProfileData?.customDisplayName || user.displayName || user.email || 'User'}</span></div>
              {userProfileData?.username && (
                <div className="text-xs text-gray-500">{user.email}</div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {user.emailVerified ? '✅ Verified' : '⚠️ Unverified'} • 
              {user.providerData[0]?.providerId === 'google.com' ? '📧 Google' : '🔐 Email'}
            </div>
            <button
              onClick={() => setShowUserProfile(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Edit your profile and username"
            >
              👤 Profile
            </button>
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
      
      <UserProfile 
        isOpen={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
        onUserProfileUpdated={() => {
          // Reload user profile when updated
          if (user) {
            const settlementService = new SettlementV2Service();
            settlementService.getUser(user.uid).then(profile => {
              setUserProfileData(profile);
            }).catch(error => {
              console.error('Failed to reload user profile:', error);
            });
          }
        }}
      />
    </div>
  );
}; 