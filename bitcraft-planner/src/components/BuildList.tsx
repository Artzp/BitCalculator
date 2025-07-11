import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { XCircleIcon } from '@heroicons/react/24/solid';

const BuildList: React.FC = () => {
  const { buildList, removeFromBuildList, updateBuildListItem, clearBuildList } = useItemsStore();

  if (buildList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7s-2 2-2 4" />
        </svg>
        <p className="font-semibold text-lg">Your queue is empty</p>
        <p className="text-sm">Add items from the catalog to start a build</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
        {buildList.map((item, index) => (
          <div key={`${item.itemId}-${index}`} className="bg-gray-700 p-3 rounded-lg flex items-center justify-between animate-fade-in">
            {/* Item Info */}
            <div>
              <p className="font-semibold text-white truncate">{useItemsStore.getState().items[item.itemId]?.name}</p>
              <p className="text-sm text-gray-400">
                Tier {useItemsStore.getState().items[item.itemId]?.tier}
              </p>
            </div>
            {/* Controls */}
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateBuildListItem(item.itemId, Number(e.target.value))}
                className="w-20 p-1 text-center bg-gray-600 border border-gray-500 rounded-md text-white"
                min="1"
              />
              <button
                onClick={() => removeFromBuildList(item.itemId)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 mt-auto">
        <button
          onClick={clearBuildList}
          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
        >
          Clear Build List
        </button>
      </div>
    </div>
  );
};

export default BuildList; 