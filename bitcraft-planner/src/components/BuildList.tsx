import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const BuildList: React.FC = () => {
  const { buildList, removeFromBuildList, updateBuildListItem, clearBuildList, items } = useItemsStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalItems = buildList.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = buildList.reduce((sum, item) => {
    const itemData = items[item.itemId];
    return sum + (itemData?.tier || 0) * item.quantity;
  }, 0);

  if (buildList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6">
        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="font-semibold text-lg text-slate-300 mb-2">Queue is empty</h3>
        <p className="text-sm text-slate-500 max-w-48">
          Add items from the catalog to start planning your build
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Queue Stats */}
      <div className="p-3 bg-slate-900/50 rounded-lg mb-4 border border-slate-700/50 flex-shrink-0">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{buildList.length}</div>
            <div className="text-xs text-slate-400">Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{totalItems}</div>
            <div className="text-xs text-slate-400">Total Items</div>
          </div>
        </div>
      </div>

      {/* Build Items */}
      <div className="flex-1 space-y-1.5 pr-1 min-h-0 overflow-y-auto">
        {buildList.map((buildItem, index) => {
          const item = items[buildItem.itemId];
          if (!item) return null;

          const rarityColor = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || '#64748b';
          const rarityName = RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Unknown';

          return (
            <BuildQueueItem
              key={`${buildItem.itemId}-${index}`}
              buildItem={buildItem}
              item={item}
              rarityColor={rarityColor}
              rarityName={rarityName}
              onUpdateQuantity={(quantity) => updateBuildListItem(buildItem.itemId, quantity)}
              onRemove={() => removeFromBuildList(buildItem.itemId)}
            />
          );
        })}
      </div>

      {/* Clear Button */}
      <div className="pt-4 mt-4 border-t border-slate-700/50 flex-shrink-0">
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
          >
            Clear Build List
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 text-center">Are you sure?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  clearBuildList();
                  setShowClearConfirm(false);
                }}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-2 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Build Queue Item Component
const BuildQueueItem = ({ buildItem, item, rarityColor, rarityName, onUpdateQuantity, onRemove }: {
  buildItem: any;
  item: any;
  rarityColor: string;
  rarityName: string;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(buildItem.quantity);

  const handleQuantitySubmit = () => {
    onUpdateQuantity(Math.max(1, tempQuantity));
    setIsEditing(false);
  };

  const getTierIcon = (tier: number) => {
    if (tier <= 2) return '🌱';
    if (tier <= 4) return '⚙️';
    if (tier <= 6) return '💎';
    return '👑';
  };

  const getRarityIcon = (rarity: number) => {
    const icons = ['⚪', '🟢', '🔵', '🟣', '🟡'];
    return icons[rarity] || '⚪';
  };

  return (
    <div className="group relative bg-slate-700/30 hover:bg-slate-700/45 border border-slate-600/50 hover:border-slate-500/70 rounded-lg p-2.5 transition-all duration-150">
      <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
          {/* Item Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
            <span className="text-lg">🔨</span>
          </div>
          
          {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-white truncate text-sm">{item.name}</h3>
            </div>
              <div className="flex items-center gap-2.5 text-[11px]">
              <div className="flex items-center gap-1">
                <span>{getTierIcon(item.tier)}</span>
                <span className="text-slate-400">T{item.tier}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{getRarityIcon(item.rarity)}</span>
                <span style={{ color: rarityColor }}>{rarityName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quantity and Controls */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                value={tempQuantity}
                onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuantitySubmit();
                  if (e.key === 'Escape') {
                    setTempQuantity(buildItem.quantity);
                    setIsEditing(false);
                  }
                }}
                className="w-14 px-2 py-1 text-center bg-slate-600 border border-slate-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onBlur={handleQuantitySubmit}
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setTempQuantity(buildItem.quantity);
                setIsEditing(true);
              }}
              className="px-3 py-1.5 bg-slate-600/50 hover:bg-slate-500/50 rounded-md transition-colors"
            >
              <span className="text-white font-medium">{buildItem.quantity}</span>
            </button>
          )}
          
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200"
            title="Remove from queue"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hover/Focus Effect (decorative overlay must not block clicks) */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-transparent group-hover:ring-white/10 group-focus-within:ring-brand-500/40 rounded-lg"></div>
    </div>
  );
};

export default BuildList; 