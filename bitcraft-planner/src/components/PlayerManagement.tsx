import React, { useState } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useAuth } from '../hooks/useAuth';

export const PlayerManagement: React.FC = () => {
  const { 
    settlement, 
    addPlayer, 
    updatePlayer, 
    removePlayer, 
    getPlayerWorkload 
  } = useSettlementStore();
  const { user } = useAuth();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const handleEditPlayer = (playerId: string, currentName: string) => {
    setEditingPlayer(playerId);
    setEditPlayerName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingPlayer && editPlayerName.trim()) {
      updatePlayer(editingPlayer, { name: editPlayerName.trim() });
      setEditingPlayer(null);
      setEditPlayerName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditPlayerName('');
  };

  const handleToggleActive = (playerId: string, isActive: boolean) => {
    updatePlayer(playerId, { isActive: !isActive });
  };

  const handleRemovePlayer = (playerId: string) => {
    if (window.confirm('Are you sure you want to remove this player? This action cannot be undone.')) {
      removePlayer(playerId);
    }
  };

  if (!settlement) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="text-gray-500 text-lg">No settlement data available</div>
        </div>
      </div>
    );
  }

  const players = settlement.players;
  const activePlayers = players.filter(p => p.isActive);
  const inactivePlayers = players.filter(p => !p.isActive);

  return (
    <div className="space-y-6">
      {/* Settlement Owner Profile */}
      {user && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-md"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">Settlement Owner</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">👑 Admin</span>
              </div>
              <div className="text-sm text-slate-600">
                <div className="font-medium">{user.displayName || 'Unknown User'}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {user.emailVerified ? '✅ Verified' : '⚠️ Unverified'} • 
                {user.providerData[0]?.providerId === 'google.com' ? '📧 Google Account' : '🔐 Email Account'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Player</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter player name..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddPlayer}
            disabled={!newPlayerName.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Add Player
          </button>
        </div>
      </div>

      {/* Players List */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Players</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {players.length} total
          </span>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">👥</div>
            <p className="text-slate-500 text-lg">No players added yet</p>
            <p className="text-slate-400 text-sm mt-2">Add players to start managing settlement tasks and projects</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => {
              const workload = getPlayerWorkload(player.id);
              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    player.isActive
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Active Status Indicator */}
                      <div className={`w-3 h-3 rounded-full ${
                        player.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      
                      {/* Player Name */}
                      {editingPlayer === player.id ? (
                        <input
                          type="text"
                          value={editPlayerName}
                          onChange={(e) => setEditPlayerName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          className="px-3 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <h3 className="font-semibold text-slate-800">{player.name}</h3>
                          <p className="text-sm text-slate-500">
                            Added {new Date(player.dateAdded).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {editingPlayer === player.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditPlayer(player.id, player.name)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(player.id, player.isActive)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              player.isActive
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {player.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Workload Information */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Projects:</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                          {workload.projects}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Tasks:</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-medium">
                          {workload.tasks}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Status:</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          player.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {player.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players Summary */}
      {players.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Players Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {activePlayers.length}
              </div>
              <div className="text-sm text-green-700">Active Players</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {inactivePlayers.length}
              </div>
              <div className="text-sm text-gray-700">Inactive Players</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {players.reduce((sum, p) => sum + getPlayerWorkload(p.id).projects + getPlayerWorkload(p.id).tasks, 0)}
              </div>
              <div className="text-sm text-blue-700">Total Assignments</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManagement; 