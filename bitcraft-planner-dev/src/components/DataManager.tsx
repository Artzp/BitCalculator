import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItemsStore } from '../state/useItemsStore';
import { firebaseService } from '../services/firebaseService';

interface DataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataManager: React.FC<DataManagerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { inventory, buildList, setInventory, setBuildList } = useItemsStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveData = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      await firebaseService.saveComplete(user.uid, inventory, buildList);
      setMessage({ type: 'success', text: 'Data saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save data' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const userData = await firebaseService.loadUserData(user.uid);
      if (userData) {
        setInventory(userData.inventory || {});
        setBuildList(userData.buildList || []);
        setMessage({ type: 'success', text: 'Data loaded successfully!' });
      } else {
        setMessage({ type: 'error', text: 'No saved data found' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      inventory,
      buildList,
      exportDate: new Date().toISOString(),
      version: 1
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitcraft-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: 'Data exported successfully!' });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.inventory) {
          setInventory(data.inventory);
        }
        if (data.buildList) {
          setBuildList(data.buildList);
        }
        
        setMessage({ type: 'success', text: 'Data imported successfully!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to import data - invalid format' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setInventory({});
      setBuildList([]);
      setMessage({ type: 'success', text: 'Data cleared successfully!' });
    }
  };

  const testDatabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('🧪 Testing database connection...');
      
      // Use the new robust connectivity test
      const result = await firebaseService.testDatabaseConnectivity(user.uid);
      
      if (result.success) {
        console.log('✅ Database connectivity test successful');
        alert('✅ Database connection successful!\n\n' + result.message + '\n\nCheck the browser console for details.');
      } else {
        console.error('❌ Database connectivity test failed:', result.message);
        alert('❌ Database test failed:\n\n' + result.message);
      }
    } catch (error) {
      console.error('❌ Database test failed:', error);
      alert('❌ Database test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Data Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Firebase Actions */}
          {user && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Cloud Storage</h3>
              <div className="space-y-2">
                <button
                  onClick={handleSaveData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save to Cloud'}
                </button>
                <button
                  onClick={handleLoadData}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load from Cloud'}
                </button>
              </div>
            </div>
          )}

          {/* Local Actions */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Local Storage</h3>
            <div className="space-y-2">
              <button
                onClick={handleExportData}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
              >
                Export Data
              </button>
              <label className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 cursor-pointer text-center block">
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clear Data */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Danger Zone</h3>
            <button
              onClick={handleClearData}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Clear All Data
            </button>
          </div>

          {/* Database Test */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Database Test</h3>
            <button
              onClick={testDatabase}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Testing...' : '🧪 Test Database Connection'}
            </button>
          </div>
        </div>

        {/* Data Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Current Data</h3>
          <div className="text-sm text-gray-600">
            <p>Inventory items: {Object.keys(inventory).length}</p>
            <p>Build list items: {buildList.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 