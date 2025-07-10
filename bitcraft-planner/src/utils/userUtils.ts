import { User } from 'firebase/auth';

interface UserWithUsername {
  username?: string;
  displayName?: string;
  email?: string;
  customDisplayName?: string; // New field for user-set display name
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

// Updated privacy-friendly display functions
export const getPrivateDisplayName = (member: any, currentUserId?: string): string => {
  if (!member || !member.user) return 'Unknown User';
  
  // Get the member's user ID
  const memberUserId = member.collaboration?.userId || member.user?.id;
  
  // If this is the current user viewing their own info, show their actual displayName
  if (currentUserId && memberUserId === currentUserId) {
    return member.user.displayName || member.user.email || 'Unknown User';
  }
  
  // For other users, use their custom display name if they set one
  if (member.user.customDisplayName) {
    return member.user.customDisplayName;
  }
  
  // If no custom display name, create a privacy-friendly version
  if (member.user.displayName && member.user.displayName !== member.user.email) {
    // If displayName is different from email, use first name only
    const firstNameMatch = member.user.displayName.match(/^([a-zA-Z]+)/);
    if (firstNameMatch) {
      return firstNameMatch[1];
    }
  }
  
  // Last resort: create username-like display from email
  if (member.user.email) {
    const emailParts = member.user.email.split('@');
    if (emailParts.length > 0) {
      const username = emailParts[0];
      // Take first part of email as username
      return username.charAt(0).toUpperCase() + username.slice(1);
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
    return 'Email hidden';
  }
  return email;
};

export const getMemberInitials = (member: any): string => {
  if (!member || !member.user) return '?';
  
  // Use custom display name if available
  const displayName = member.user.customDisplayName || member.user.displayName;
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

/**
 * Checks if a custom display name is valid
 */
export const isValidCustomDisplayName = (displayName: string): { isValid: boolean; error?: string } => {
  if (!displayName || !displayName.trim()) {
    return { isValid: false, error: 'Display name cannot be empty' };
  }

  if (displayName.trim().length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (displayName.trim().length > 30) {
    return { isValid: false, error: 'Display name cannot be longer than 30 characters' };
  }

  // Allow letters, numbers, spaces, and common punctuation
  const validDisplayName = /^[a-zA-Z0-9\s\-_\.]+$/;
  if (!validDisplayName.test(displayName.trim())) {
    return { isValid: false, error: 'Display name can only contain letters, numbers, spaces, dashes, underscores, and periods' };
  }

  return { isValid: true };
}; 