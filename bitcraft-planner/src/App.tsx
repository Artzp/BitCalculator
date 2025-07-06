import React, { useEffect, useState, useCallback } from 'react';
import { useItemsStore } from './state/useItemsStore';
import { ItemsData } from './types/Item';
import BitCalculatorPage from './components/BitCalculatorPage';
import { AuthHeader } from './components/AuthHeader';
import { useAuth } from './hooks/useAuth';
import { firebaseService, SaveStatus } from './services/firebaseService';
import { SaveStatusIndicator } from './components/SaveStatusIndicator';
import './App.css';

function App() {
  const { 
    setItems, 
    setIsLoading, 
    isLoading,
    setInventory,
    setBuildList,
    inventory,
    buildList
  } = useItemsStore();
  
  const { user, loading: authLoading } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null
  });
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Subscribe to save status changes
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToSaveStatus(setSaveStatus);
    return unsubscribe;
  }, []);

  // Load items data
  useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const response = await fetch('/data/recipes.json');
        const data: ItemsData = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadItems();
  }, [setItems, setIsLoading]);

  // Load user data when authenticated
  useEffect(() => {
    if (user && !dataLoaded) {
      const loadUserData = async () => {
        try {
          console.log('🔄 Loading user data...');
          // Force refresh database status since user is now authenticated
          console.log('🔄 Refreshing database status...');
          await firebaseService.refreshDatabaseStatus();
          
          const userData = await firebaseService.loadUserData(user.uid);
          if (userData) {
            console.log('📥 User data loaded:', userData);
            setInventory(userData.inventory || {});
            setBuildList(userData.buildList || []);
          } else {
            console.log('🆕 No saved data found - starting fresh');
            setInventory({});
            setBuildList([]);
          }
        } catch (error) {
          console.error('❌ Failed to load user data:', error);
          // Start with empty data on error
          setInventory({});
          setBuildList([]);
        } finally {
          // Always set dataLoaded to true to prevent infinite loading
          setDataLoaded(true);
        }
      };

      loadUserData();
    } else if (!user) {
      // Reset data when user logs out
      setDataLoaded(false);
      setInventory({});
      setBuildList([]);
    }
  }, [user, dataLoaded, setInventory, setBuildList]);

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (inventory: any, buildList: any) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (user && dataLoaded) {
            try {
              await firebaseService.saveComplete(user.uid, inventory, buildList);
            } catch (error) {
              console.error('❌ Failed to save user data:', error);
            }
          }
        }, 2000); // Wait 2 seconds before saving
      };
    })(),
    [user, dataLoaded]
  );

  // Save user data when inventory or build list changes
  useEffect(() => {
    if (user && dataLoaded && !isLoading) {
      debouncedSave(inventory, buildList);
    }
  }, [user, inventory, buildList, isLoading, dataLoaded, debouncedSave]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (user && dataLoaded && !saveStatus.isSaving) {
      const autoSaveInterval = setInterval(async () => {
        try {
          await firebaseService.saveComplete(user.uid, inventory, buildList);
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        }
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [user, dataLoaded, inventory, buildList, saveStatus.isSaving]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-4">
            {authLoading ? 'Loading...' : 'Loading BitCraft items...'}
          </div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="w-full px-4 py-6">
        <AuthHeader />
        
        {/* Save Status Indicator */}
        {user && <SaveStatusIndicator saveStatus={saveStatus} />}
        
        {/* Loading overlay for user data - with timeout protection */}
        {user && saveStatus.isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-semibold mb-2">Loading your data...</p>
              <p className="text-sm text-gray-600">
                This should only take a few seconds
              </p>
            </div>
          </div>
        )}
        
        {/* Error notification */}
        {saveStatus.error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <p className="font-semibold">Save Error</p>
            <p className="text-sm">{saveStatus.error}</p>
          </div>
        )}
        
        {/* Main Application - Bit Calculator */}
        <div className="h-[calc(100vh-200px)]">
          <BitCalculatorPage />
        </div>
      </div>
    </div>
  );
}

export default App; 