import React, { useEffect, useState, useCallback } from 'react';
import { useItemsStore } from './state/useItemsStore';
import { useSettlementStore } from './state/useSettlementStore';
import { ItemsData } from './types/Item';
import BitCalculatorPage from './components/BitCalculatorPage';
import SettlementPage from './components/SettlementPage';
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
  
  const {
    settlement,
    resetSettlement
  } = useSettlementStore();
  
  const { user, loading: authLoading } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null
  });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState<'calculator' | 'settlement'>('calculator');
  
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
            // Settlement data is now handled automatically by the settlement store
          } else {
            console.log('🆕 No saved data found - starting fresh');
            setInventory({});
            setBuildList([]);
            // Settlement will be initialized by the SettlementPage component
          }
        } catch (error) {
          console.error('❌ Failed to load user data:', error);
          // Start with empty data on error
          setInventory({});
          setBuildList([]);
          resetSettlement();
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
      resetSettlement();
    }
  }, [user, dataLoaded, setInventory, setBuildList, resetSettlement]);

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (inventory: any, buildList: any, settlementData?: any) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (user && dataLoaded) {
            try {
              await firebaseService.saveComplete(user.uid, inventory, buildList, settlementData);
            } catch (error) {
              console.error('❌ Failed to save user data:', error);
            }
          }
        }, 2000); // Wait 2 seconds before saving
      };
    })(),
    [user, dataLoaded]
  );

  // Save user data when inventory, build list, or settlement changes
  useEffect(() => {
    if (user && dataLoaded && !isLoading) {
      debouncedSave(inventory, buildList, settlement || undefined);
    }
  }, [user, inventory, buildList, settlement, isLoading, dataLoaded, debouncedSave]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (user && dataLoaded && !saveStatus.isSaving) {
      const autoSaveInterval = setInterval(async () => {
        try {
          await firebaseService.saveComplete(user.uid, inventory, buildList, settlement || undefined);
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        }
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [user, dataLoaded, inventory, buildList, settlement, saveStatus.isSaving]);

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
        
        {/* Navigation */}
        <div className="mb-6">
          <nav className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="flex">
              <button
                onClick={() => setCurrentPage('calculator')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all duration-200 rounded-l-xl ${
                  currentPage === 'calculator'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">🧮</span>
                <span>Bit Calculator</span>
              </button>
              <button
                onClick={() => setCurrentPage('settlement')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all duration-200 rounded-r-xl ${
                  currentPage === 'settlement'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">🏘️</span>
                <span>Settlement System</span>
              </button>
            </div>
          </nav>
        </div>
        
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
        
        {/* Main Application Content */}
        <div className="h-[calc(100vh-280px)]">
          {currentPage === 'calculator' ? (
            <BitCalculatorPage />
          ) : (
            <SettlementPage />
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 