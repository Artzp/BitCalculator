import { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  AuthError
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase/config';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Global flag to track intentional logout
let isIntentionalLogout = false;

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    // Complete any pending redirect on native platforms
    (async () => {
      try {
        if (Capacitor.getPlatform() !== 'web') {
          await getRedirectResult(auth);
        }
      } catch (_e) {
        // ignore; onAuthStateChanged will still reflect auth state
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({
        user,
        loading: false,
        error: null
      });
      
      // Reset the intentional logout flag after auth state change is processed
      if (!user && isIntentionalLogout) {
        // Give App.tsx a moment to process the auth change, then reset flag
        setTimeout(() => {
          isIntentionalLogout = false;
        }, 100);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (Capacitor.getPlatform() !== 'web') {
        // Prefer native plugin on Android/iOS to avoid localhost callback issues
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const { credential: nativeCredential } = await FirebaseAuthentication.signInWithGoogle();
        if (nativeCredential?.idToken) {
          const cred = GoogleAuthProvider.credential(nativeCredential.idToken);
          const result = await signInWithCredential(auth, cred);
          setAuthState(prev => ({ ...prev, loading: false }));
          return result;
        }
        // Fallback to redirect if native credential missing
        await signInWithRedirect(auth, googleProvider);
        return null;
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        return result;
      }
    } catch (error) {
      const authError = error as AuthError;
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: authError.message 
      }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Set flag to indicate this is an intentional logout
      console.log('🚪 Intentional logout initiated');
      isIntentionalLogout = true;
      
      await signOut(auth);
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
          await FirebaseAuthentication.signOut();
        } catch (_e) {}
      }
    } catch (error) {
      // Reset flag if logout fails
      isIntentionalLogout = false;
      const authError = error as AuthError;
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: authError.message 
      }));
      throw error;
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    logout,
    clearError
  };
};

// Export function to check if logout was intentional (for App.tsx)
export const wasIntentionalLogout = () => isIntentionalLogout; 