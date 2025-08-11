import { render, screen } from '@testing-library/react';
import App from './App';

// Mock auth hook to avoid real Firebase side-effects in tests
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: true }),
  wasIntentionalLogout: () => true,
}));

// Minimal mock for firebaseService used by App effects
jest.mock('./services/firebaseService', () => ({
  firebaseService: {
    subscribeToSaveStatus: () => () => {},
    refreshDatabaseStatus: async () => {},
    saveUserProfile: async () => {},
    loadUserData: async () => null,
    saveComplete: async () => {},
  },
}));

// Mock fetch to avoid network calls from data loader
global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

test('renders loading state without crashing', () => {
  render(<App />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
