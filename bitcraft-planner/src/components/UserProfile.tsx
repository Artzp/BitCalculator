import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SettlementV2Service } from '../services/settlementV2Service';
import { isValidUsername } from '../utils/userUtils';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onUserProfileUpdated?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, onUserProfileUpdated }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [originalUsername, setOriginalUsername] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const settlementService = new SettlementV2Service();

  // Load user profile when component opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserProfile();
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      const profile = await settlementService.getUser(user.uid);
      setUserProfile(profile);
      
      const currentUsername = profile?.username || profile?.displayName || '';
      setUsername(currentUsername);
      setOriginalUsername(currentUsername);
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate username
    const validation = isValidUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await settlementService.updateUser(user.uid, {
        username: username.trim()
      });
      
      setOriginalUsername(username.trim());
      setSuccess('Username updated successfully!');
      
      // Notify parent component about the update
      if (onUserProfileUpdated) {
        onUserProfileUpdated();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error updating username:', error);
      setError('Failed to update username. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(originalUsername);
    setError('');
    setSuccess('');
    onClose();
  };

  const hasChanges = username.trim() !== originalUsername;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">User Profile</h2>
            <button
              onClick={handleCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100 mt-2">Customize your profile for the BitCraft community</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Current Account Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Account Information</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Email:</span> {user?.email}</p>
                  <p><span className="font-medium">Display Name:</span> {user?.displayName || 'Not set'}</p>
                  <p><span className="font-medium">Account Type:</span> {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email'}</p>
                </div>
              </div>

              {/* Username Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Username/Nickname
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username for the game"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the name other players will see. Only letters, numbers, underscores, and dashes allowed.
                  </p>
                </div>

                {/* Username Preview */}
                {username.trim() && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Preview:</span> Other players will see you as <span className="font-semibold">"{username.trim()}"</span>
                    </p>
                  </div>
                )}

                {/* Character Count */}
                <div className="text-right">
                  <span className={`text-xs ${username.length > 15 ? 'text-red-600' : 'text-gray-500'}`}>
                    {username.length}/20 characters
                  </span>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              {/* Privacy Note */}
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">🔒 Privacy Note:</span> Your email and real name will only be visible to you. 
                  Other players will only see your username/nickname.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-md transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 