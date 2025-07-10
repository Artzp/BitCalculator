import { User } from 'firebase/auth';

interface UserWithUsername {
  username?: string;
  displayName?: string;
  email?: string;
}

/**
 * Gets the user's display name with priority: username > displayName > email > 'Unknown User'
 * This function prioritizes the game username/nickname over the real name/email for privacy
 */
export const getUserDisplayName = (user: UserWithUsername | null | undefined): string => {
  if (!user) return 'Unknown User';
  
  // Priority: username (game nickname) > displayName > email > fallback
  return user.username || user.displayName || user.email || 'Unknown User';
};

/**
 * Gets the user's display name for Firebase Auth users
 */
export const getAuthUserDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'Unknown User';
  
  // For Firebase Auth users, we don't have username yet, so fall back to displayName > email
  return user.displayName || user.email || 'Unknown User';
};

/**
 * Gets the user's display name for settlement members
 */
export const getMemberDisplayName = (member: any): string => {
  if (!member || !member.user) return 'Unknown User';
  
  // Priority: displayName > email > 'Unknown User'
  return member.user.displayName || member.user.email || 'Unknown User';
};

/**
 * Checks if a username is valid for the game
 */
export const isValidUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (username.trim().length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters long' };
  }

  if (username.trim().length > 20) {
    return { isValid: false, error: 'Username cannot be longer than 20 characters' };
  }

  // Check for valid characters (alphanumeric, underscore, dash)
  const validUsername = /^[a-zA-Z0-9_-]+$/;
  if (!validUsername.test(username.trim())) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and dashes' };
  }

  return { isValid: true };
}; 

// New privacy-friendly display functions
export const getPrivateDisplayName = (member: any, currentUserId?: string): string => {
  if (!member || !member.user) return 'Unknown User';
  
  // If this is the current user viewing their own info, show their actual displayName
  const memberUserId = member.collaboration?.userId || member.user?.id;
  if (currentUserId && memberUserId === currentUserId) {
    return member.user.displayName || member.user.email || 'Unknown User';
  }
  
  // For other users, prioritize displayName but fallback to a privacy-friendly version
  if (member.user.displayName) {
    return member.user.displayName;
  }
  
  // If no displayName, create a privacy-friendly version from email
  if (member.user.email) {
    const emailParts = member.user.email.split('@');
    if (emailParts.length > 0) {
      const username = emailParts[0];
      // Take first 3-4 characters and add "***" for privacy
      if (username.length > 4) {
        return username.substring(0, 4) + '***';
      }
      return username;
    }
  }
  
  return 'Unknown User';
};

export const getPrivateEmail = (member: any, currentUserId?: string): string => {
  if (!member || !member.user) return '';
  
  // Only show email to the user themselves
  const memberUserId = member.collaboration?.userId || member.user?.id;
  if (currentUserId && memberUserId === currentUserId) {
    return member.user.email || '';
  }
  
  // For other users, don't show email at all
  return '';
};

export const getPrivateEmailDisplay = (member: any, currentUserId?: string): string => {
  const email = getPrivateEmail(member, currentUserId);
  if (!email) {
    return 'Email hidden for privacy';
  }
  return email;
};

export const getMemberInitials = (member: any): string => {
  if (!member || !member.user) return '?';
  
  const displayName = member.user.displayName;
  if (displayName) {
    // Get initials from display name
    const nameParts = displayName.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return displayName[0].toUpperCase();
  }
  
  // Fallback to email initial
  if (member.user.email) {
    return member.user.email[0].toUpperCase();
  }
  
  return '?';
}; 