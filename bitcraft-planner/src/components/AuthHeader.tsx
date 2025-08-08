import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';
import { DataManager } from './DataManager';
import { UserProfile } from './UserProfile';
import { SettlementV2Service } from '../services/settlementV2Service';
import { getAuthUserDisplayName } from '../utils/userUtils';

type AuthHeaderProps = {
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  rightExtra?: React.ReactNode;
};

export const AuthHeader: React.FC<AuthHeaderProps> = ({ darkMode, onToggleDarkMode, rightExtra }) => {
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
    window.open('https://discord.gg/FkYCumCYkp', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="bc-toolbar shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      <div className="bc-container">
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600 text-white grid place-items-center shadow-soft text-sm">BC</div>
            <div>
              <div className="text-base font-semibold">BitCraft Calculator</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Planning and collaboration</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscordClick}
              className="bc-btn-secondary"
              title="Join our Discord community for support, bug reports, feature requests, and discussions"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Discord</span>
            </button>

            {typeof onToggleDarkMode === 'function' && (
              <button onClick={onToggleDarkMode} className="bc-btn-secondary" title="Toggle theme">
                {darkMode ? '🌙' : '☀️'}
                <span className="hidden sm:inline">Theme</span>
              </button>
            )}

            {rightExtra}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-right mr-1">
                  <div className="text-sm">
                    {userProfileData?.username || userProfileData?.customDisplayName || user.displayName || user.email || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.emailVerified ? 'Verified' : 'Unverified'} • {user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
                  </div>
                </div>
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="bc-btn-secondary"
                  title="Edit your profile and username"
                >
                  👤
                  <span className="hidden sm:inline">Profile</span>
                </button>
                <button
                  onClick={() => setShowDataManager(true)}
                  className="bc-btn-secondary"
                  title="Manage your saved data"
                >
                  💾
                  <span className="hidden sm:inline">Data</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="bc-btn-primary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bc-btn-primary"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
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
          if (user) {
            const settlementService = new SettlementV2Service();
            settlementService
              .getUser(user.uid)
              .then((profile) => {
                setUserProfileData(profile);
              })
              .catch((error) => {
                console.error('Failed to reload user profile:', error);
              });
          }
        }}
      />
    </header>
  );
}; 