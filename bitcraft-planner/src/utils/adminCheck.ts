import { auth } from '../firebase/config';

// Admin email addresses
const ADMIN_EMAILS = [
  'art.leshchyna@gmail.com'
];

export const isAdmin = (): boolean => {
  const user = auth.currentUser;
  
  // Debug logging
  console.log('🔑 Admin Check Details:', {
    hasUser: !!user,
    userEmail: user?.email || 'No email',
    userEmailLower: user?.email?.toLowerCase() || 'No email',
    adminEmails: ADMIN_EMAILS,
    emailVerified: user?.emailVerified || false,
    timestamp: new Date().toISOString()
  });
  
  if (!user || !user.email) {
    console.log('❌ Admin check failed: No user or email');
    return false;
  }
  
  const isUserAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
  console.log(`${isUserAdmin ? '✅' : '❌'} Admin check result:`, isUserAdmin);
  
  return isUserAdmin;
};

export const requireAdmin = (): boolean => {
  if (!isAdmin()) {
    console.warn('🚫 Admin access required');
    return false;
  }
  return true;
};

export const getAdminInfo = () => {
  const user = auth.currentUser;
  return {
    isAdmin: isAdmin(),
    userEmail: user?.email || null,
    userId: user?.uid || null
  };
}; 