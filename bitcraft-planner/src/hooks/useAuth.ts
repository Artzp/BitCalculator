import { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  AuthError
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({
        user,
        loading: false,
        error: null
      });
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result;
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
      await signOut(auth);
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