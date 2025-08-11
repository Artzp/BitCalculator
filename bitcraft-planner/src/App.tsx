import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useItemsStore } from './state/useItemsStore';
import { useSettlementStore, setImmediateSaveCallback } from './state/useSettlementStore';
import { ItemsData } from './types/Item';
import { Project, Task } from './types/Settlement';
import BitCalculatorPage from './components/BitCalculatorPage';
import SettlementPage from './components/SettlementPage';
import { AuthHeader } from './components/AuthHeader';
import { useAuth, wasIntentionalLogout } from './hooks/useAuth';
import { firebaseService, SaveStatus } from './services/firebaseService';
import { SaveStatusIndicator } from './components/SaveStatusIndicator';
import { auth } from './firebase/config';
import { projectLogger } from './utils/projectLogger';
import { isAdmin } from './utils/adminCheck';
import { Tabs } from './components/Tabs';
import './App.css';

// Deep comparison utility
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

// User profile comparison utility
const userProfileChanged = (current: any, previous: any): boolean => {
  if (!previous) return true;
  
  // Only check fields that might actually change
  const relevantFields = ['email', 'displayName', 'photoURL', 'emailVerified'];
  
  for (let field of relevantFields) {
    if (current[field] !== previous[field]) return true;
  }
  
  return false;
};

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
    setSettlement
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
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bc_dark_mode');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const [useModernUI, setUseModernUI] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bc_ui_modern');
      return saved ? JSON.parse(saved) : true; // default Modern
    } catch { return true; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try { localStorage.setItem('bc_dark_mode', JSON.stringify(darkMode)); } catch {}
  }, [darkMode]);

  useEffect(() => {
    try { localStorage.setItem('bc_ui_modern', JSON.stringify(useModernUI)); } catch {}
  }, [useModernUI]);
  
  // Make setIsRestoring available for DatabaseDebugger (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).__setIsRestoring = setIsRestoring;
      return () => {
        delete (window as any).__setIsRestoring;
      };
    }
  }, []);

  const handleTabChange = (tab: 'calculator' | 'settlement') => {
    setCurrentPage(tab);
  };

  // Admin check
  useEffect(() => {
    const adminStatus = isAdmin();
    setIsUserAdmin(adminStatus);
    
    console.log('🔑 App.tsx Admin Check:', {
      user: user?.email || 'Not logged in',
      isAdmin: adminStatus
    });
  }, [user]);
  
  // Log restoration mode changes
  useEffect(() => {
    if (isRestoring) {
      console.log('🛡️ RESTORATION MODE ENABLED - Auto-save disabled to prevent data loss');
    } else {
      console.log('🔄 RESTORATION MODE DISABLED - Auto-save re-enabled');
    }
  }, [isRestoring]);
  
  // Refs to track previous values for deep comparison
  const previousData = useRef<{
    inventory: any;
    buildList: any;
    settlement: any;
    userProfile: any;
  }>({
    inventory: null,
    buildList: null,
    settlement: null,
    userProfile: null
  });

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
          
          projectLogger.logDataLoad(
            'App.tsx.loadUserData',
            'LOAD_USER_DATA_START',
            { userId: user.uid, email: user.email }
          );
          
          // Force refresh database status since user is now authenticated
          console.log('🔄 Refreshing database status...');
          await firebaseService.refreshDatabaseStatus();
          
          // Initialize V2 user profile with username
          try {
            console.log('👤 Initializing user profile...');
            const { SettlementV2Service } = await import('./services/settlementV2Service');
            const settlementService = new SettlementV2Service();
            
            await settlementService.ensureUserExists(user.uid, {
              email: user.email || '',
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined
            });
            
            console.log('✅ User profile initialized');
          } catch (error) {
            console.error('❌ Failed to initialize user profile:', error);
          }
          
          const userData = await firebaseService.loadUserData(user.uid);
          if (userData) {
            console.log('📥 User data loaded:', userData);
            
            // Load collaborative projects the user has joined
            try {
              const { enhancedFirebaseService } = await import('./services/enhancedFirebaseService');
              const collaborations = await enhancedFirebaseService.getProjectCollaborations(user.uid);
              console.log('🤝 Collaborative projects loaded:', collaborations.length);
              
              // Load actual project data for each collaboration
              if (userData.settlement && collaborations.length > 0) {
                const collaborativeProjects: Project[] = [];
                const collaborativeTasks: Task[] = [];
                
                for (const collab of collaborations) {
                  console.log('📥 Loading data for collaboration:', collab.projectName);
                  
                  const projectData = await enhancedFirebaseService.loadCollaborativeProjectData(collab);
                  
                  if (projectData) {
                    const collaborativeProjectId = `collab-${collab.id}`;
                    
                    // Create the collaborative project with actual data
                    const collaborativeProject: Project = {
                      ...projectData.project,
                      id: collaborativeProjectId,
                      name: `${collab.projectName} (Shared)`,
                      description: `${projectData.project.description || ''} • Collaborative project by ${collab.ownerName}`,
                      notes: `Original project ID: ${collab.projectId} • Owner: ${collab.ownerName} • Collaboration ID: ${collab.id}`
                    };
                    
                    collaborativeProjects.push(collaborativeProject);
                    
                    // Add tasks with updated projectId to match the collaborative project
                    const tasksArray = Array.isArray(projectData.tasks) ? projectData.tasks : [];
                    const updatedTasks = tasksArray.map(task => ({
                      ...task,
                      id: `collab-task-${task.id}`,
                      projectId: collaborativeProjectId
                    }));
                    
                    collaborativeTasks.push(...updatedTasks);
                    
                    console.log('✅ Loaded collaborative project:', {
                      name: collaborativeProject.name,
                      items: collaborativeProject.items?.length || 0,
                      tasks: updatedTasks.length
                    });
                  } else {
                    console.log('⚠️ Could not load data for collaboration:', collab.projectName);
                  }
                }
                
                // Merge collaborative projects and tasks with user's own data
                const existingProjects = Array.isArray(userData.settlement.projects) ? userData.settlement.projects : [];
                const existingTasks = Array.isArray(userData.settlement.tasks) ? userData.settlement.tasks : [];
                
                userData.settlement.projects = [...existingProjects, ...collaborativeProjects];
                userData.settlement.tasks = [...existingTasks, ...collaborativeTasks];
                
                console.log('🔄 Merged data:', {
                  totalProjects: userData.settlement.projects.length,
                  totalTasks: userData.settlement.tasks.length,
                  collaborativeProjects: collaborativeProjects.length,
                  collaborativeTasks: collaborativeTasks.length
                });
              }
            } catch (error) {
              console.error('❌ Failed to load collaborative projects:', error);
            }
            
            console.log('🔍 Settlement data being set:', {
              hasSettlement: !!userData.settlement,
              projectCount: userData.settlement?.projects?.length || 0,
              settlementName: userData.settlement?.name,
              projects: userData.settlement?.projects
            });
            
            setInventory(userData.inventory || {});
            setBuildList(userData.buildList || []);
            // Load settlement data into the settlement store
            setSettlement(userData.settlement);
            
            console.log('✅ Settlement data set in store');

            // Store initial values for comparison
            previousData.current = {
              inventory: userData.inventory || {},
              buildList: userData.buildList || [],
              settlement: userData.settlement,
              userProfile: userData.userProfile
            };

            // Only save user profile if it actually changed
            const userProfile = {
              email: user.email || '',
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
              emailVerified: user.emailVerified || false,
              providerId: user.providerData[0]?.providerId || 'unknown',
              createdAt: userData?.userProfile?.createdAt || new Date(),
              lastSignIn: new Date()
            };
            
            if (userProfileChanged(userProfile, userData.userProfile)) {
              console.log('👤 User profile changed, saving...');
              await firebaseService.saveUserProfile(user.uid, userProfile);
              previousData.current.userProfile = userProfile;
            } else {
              console.log('👤 User profile unchanged, skipping save');
            }
          } else {
            console.log('🆕 No saved data found - starting fresh');
            setInventory({});
            setBuildList([]);
            
            // CRITICAL FIX: Only initialize settlement if we don't have existing data
            // This prevents data loss during loading operations
            const currentSettlement = useSettlementStore.getState().settlement;
            if (!currentSettlement || !currentSettlement.projects || currentSettlement.projects.length === 0) {
              console.log('🔧 Initializing empty settlement (no existing projects)');
              setSettlement(null);
            } else {
              console.log('🛡️ Preserving existing settlement with projects:', currentSettlement.projects.length);
              // Keep existing settlement data to prevent project loss
            }

            // Initialize previous data
            previousData.current = {
              inventory: {},
              buildList: [],
              settlement: currentSettlement,
              userProfile: null
            };

            // Save user profile information for new users
            const userProfile = {
              email: user.email || '',
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
              emailVerified: user.emailVerified || false,
              providerId: user.providerData[0]?.providerId || 'unknown',
              createdAt: new Date(),
              lastSignIn: new Date()
            };
            
            console.log('👤 Saving new user profile:', userProfile);
            await firebaseService.saveUserProfile(user.uid, userProfile);
            previousData.current.userProfile = userProfile;
          }
        } catch (error) {
          console.error('❌ Failed to load user data:', error);
          // Start with empty data on error - but preserve existing projects
          setInventory({});
          setBuildList([]);
          
          // CRITICAL FIX: Don't wipe settlement on load errors to prevent project loss
          const currentSettlement = useSettlementStore.getState().settlement;
          if (!currentSettlement || !currentSettlement.projects || currentSettlement.projects.length === 0) {
            console.log('🔧 No existing projects - safe to initialize empty settlement');
            setSettlement(null);
          } else {
            console.log('🛡️ Load error but preserving existing settlement with projects:', currentSettlement.projects.length);
            console.log('⚠️ User should try refreshing or check their network connection');
          }
        } finally {
          // Always set dataLoaded to true to prevent infinite loading
          setDataLoaded(true);
        }
      };

      loadUserData();
    } else if (!user) {
      // Reset data when user logs out - but distinguish between intentional logout and auth transitions
      const isIntentional = wasIntentionalLogout();
      console.log(`⚠️ User is null - ${isIntentional ? 'intentional logout' : 'checking if auth transition'}`);
      
      setDataLoaded(false);
      setInventory({});
      setBuildList([]);
      
      if (isIntentional) {
        // Intentional logout - immediately clear all data
        console.log('🚪 Intentional logout - immediately clearing settlement data');
        setSettlement(null, { force: true });
        previousData.current = {
          inventory: null,
          buildList: null,
          settlement: null,
          userProfile: null
        };
      } else {
        // Possible auth transition - use delay to confirm
        console.log('🛡️ Possible auth transition - waiting to confirm...');
        setTimeout(() => {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log('✅ Confirmed unexpected logout - clearing settlement data');
            setSettlement(null, { force: true });
            previousData.current = {
              inventory: null,
              buildList: null,
              settlement: null,
              userProfile: null
            };
          } else {
            console.log('🛡️ Auth transition confirmed - user re-authenticated, preserving settlement data');
            // User came back during transition - reload their data
            if (!dataLoaded) {
              console.log('🔄 Triggering data reload after auth transition...');
              setDataLoaded(false);
            }
          }
        }, 3000); // Wait 3 seconds to confirm logout vs auth transition
      }
    }
  }, [user, dataLoaded, setInventory, setBuildList, setSettlement]);

  // Optimized debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (inventory: any, buildList: any, settlementData?: any) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (user && dataLoaded) {
            // Deep comparison to avoid unnecessary saves
            const currentData = {
              inventory: inventory || {},
              buildList: buildList || [],
              settlement: settlementData || null
            };

            const hasChanges = 
              !deepEqual(currentData.inventory, previousData.current.inventory) ||
              !deepEqual(currentData.buildList, previousData.current.buildList) ||
              !deepEqual(currentData.settlement, previousData.current.settlement);

            if (hasChanges) {
              try {
                console.log('💾 Data changed, saving...');
                await firebaseService.saveComplete(user.uid, inventory, buildList, settlementData);
                
                // Update previous data
                previousData.current.inventory = currentData.inventory;
                previousData.current.buildList = currentData.buildList;
                previousData.current.settlement = currentData.settlement;
              } catch (error) {
                console.error('❌ Failed to save user data:', error);
              }
            } else {
              console.log('📝 No changes detected, skipping save');
            }
          }
        }, 2000); // 2 seconds - fast enough to feel responsive, slow enough to batch changes
      };
    })(),
    [user, dataLoaded]
  );

  // Set up immediate save callback for critical operations
  useEffect(() => {
    if (user && dataLoaded) {
      const immediateSave = async (settlementData: any) => {
        try {
          console.log('⚡ Immediate save triggered for critical operation');
          
          // Get current data instead of using stale closures
          const currentInventory = useItemsStore.getState().inventory;
          const currentBuildList = useItemsStore.getState().buildList;
          
          console.log('🔍 Using current data for immediate save:', {
            inventoryKeys: Object.keys(currentInventory).length,
            buildListLength: currentBuildList.length,
            settlementProjects: settlementData?.projects?.length || 0
          });
          
          await firebaseService.saveComplete(user.uid, currentInventory, currentBuildList, settlementData);
          
          // Update previous data to prevent duplicate saves
          previousData.current.inventory = currentInventory;
          previousData.current.buildList = currentBuildList;
          previousData.current.settlement = settlementData;
        } catch (error) {
          console.error('❌ Failed immediate save:', error);
        }
      };
      
      setImmediateSaveCallback(immediateSave);
    }
  }, [user, dataLoaded]); // Remove inventory and buildList dependencies to prevent stale closures

  // Save user data when inventory, build list, or settlement changes
  useEffect(() => {
    if (user && dataLoaded && !isLoading && !isRestoring) {
      // Get current settlement state directly from store to avoid stale React state
      const currentSettlement = useSettlementStore.getState().settlement;
      debouncedSave(inventory, buildList, currentSettlement || undefined);
    }
  }, [user, inventory, buildList, settlement, isLoading, dataLoaded, debouncedSave, isRestoring]);

  // Save on window blur/beforeunload for better UX
  useEffect(() => {
    if (user && dataLoaded) {
      const handleWindowBlur = async () => {
        // Skip saving if currently restoring to prevent overwriting restored data
        if (isRestoring) {
          console.log('🛡️ Skipping window blur save - restoration in progress');
          return;
        }
        
        // Always save on window blur to be safe - don't rely on change detection
        try {
          console.log('🔄 Saving before window blur...');
          // Get current settlement state directly from store to avoid stale React state
          const currentSettlement = useSettlementStore.getState().settlement;
          await firebaseService.saveComplete(user.uid, inventory, buildList, currentSettlement || undefined);
          
          // Update previous data
          const currentData = {
            inventory: inventory || {},
            buildList: buildList || [],
            settlement: currentSettlement || null
          };
          previousData.current.inventory = currentData.inventory;
          previousData.current.buildList = currentData.buildList;
          previousData.current.settlement = currentData.settlement;
        } catch (error) {
          console.error('❌ Failed to save on window blur:', error);
        }
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Skip saving if currently restoring to prevent overwriting restored data
        if (isRestoring) {
          console.log('🛡️ Skipping beforeunload save - restoration in progress');
          return;
        }
        
        // Some browsers require returnValue to be set
        e.preventDefault();
        e.returnValue = '';
        
        // Save data immediately
        console.log('�� Saving before page unload...');
        // Get current settlement state directly from store to avoid stale React state
        const currentSettlement = useSettlementStore.getState().settlement;
        firebaseService.saveComplete(user.uid, inventory, buildList, currentSettlement || undefined);
      };

      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user, dataLoaded, inventory, buildList, isRestoring]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen app-surface bg-gray-50 text-slate-800 dark:bg-gray-950 dark:text-gray-100 flex items-center justify-center">
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
    <div className={`App min-h-screen ${useModernUI ? 'app-surface bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100' : (darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900')}`}>
      <AuthHeader
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(v => !v)}
        rightExtra={(
          <button
            onClick={() => setUseModernUI(v => !v)}
            className="bc-btn-secondary"
            title="Toggle between Classic and Modern UI"
          >
            {useModernUI ? 'Classic' : 'Modern'}
          </button>
        )}
      />

      {useModernUI ? (
        <div className="bc-container">
          <div className="py-4 animate-fade-in">
            <SaveStatusIndicator saveStatus={saveStatus} />
          </div>
          <div className="py-4">
            <div className="bc-card">
              <div className="bc-card-header">
                <Tabs activeTab={currentPage} onTabClick={handleTabChange} />
              </div>
              <div className="bc-card-body">
                {currentPage === 'calculator' && <BitCalculatorPage />}
                {currentPage === 'settlement' && <SettlementPage />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-4">
            {/* Classic: header already rendered above; only keep spacing consistent */}
          </div>
          <SaveStatusIndicator saveStatus={saveStatus} />
          <div className="w-full px-4 py-4">
            <Tabs activeTab={currentPage} onTabClick={handleTabChange} />
            {currentPage === 'calculator' && <BitCalculatorPage />}
            {currentPage === 'settlement' && <SettlementPage />}
          </div>
        </>
      )}
    </div>
  );
}

export default App;