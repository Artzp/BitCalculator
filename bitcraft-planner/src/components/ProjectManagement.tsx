import React, { useState } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useItemsStore } from '../state/useItemsStore';
import { Project } from '../types/Settlement';
import { calculateMaterials } from '../utils/calculator';
import { getProjectMaterials } from '../utils/settlementIntegration';

const ProjectManagement: React.FC = () => {
  const { 
    settlement, 
    createProject, 
    updateProject, 
    deleteProject, 
    addItemToProject,
    removeItemFromProject,
    generateTasksForProject,
    assignPlayersToProject,
    getProjectProgress,
    getProjectTasks,
    getProjectMaterials,
    releaseMaterialsForProject
  } = useSettlementStore();
  
  const { items } = useItemsStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);

  if (!settlement) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="text-gray-500 text-lg">No settlement data available</div>
        </div>
      </div>
    );
  }

  const projects = settlement.projects;
  const players = settlement.players;

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const projectId = createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
    }
  };

  const handleAddItemToProject = (projectId: string) => {
    if (selectedItemId && selectedQuantity > 0) {
      const item = items[selectedItemId];
      if (item) {
        addItemToProject(projectId, selectedItemId, item.name, selectedQuantity, selectedRecipeIndex);
        setSelectedItemId('');
        setSelectedQuantity(1);
        setSelectedRecipeIndex(0);
        setShowAddItemForm(null);
      }
    }
  };

  const handleRemoveItemFromProject = (projectId: string, itemId: string) => {
    if (window.confirm('Are you sure you want to remove this item from the project?')) {
      removeItemFromProject(projectId, itemId);
    }
  };

  const handleGenerateTasksForProject = (projectId: string) => {
    generateTasksForProject(items, projectId);
  };

  const handleAssignPlayers = (projectId: string, playerIds: string[]) => {
    assignPlayersToProject(projectId, playerIds);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter items based on search term
  const filteredItems = Object.entries(items).filter(([itemId, item]) => {
    if (!searchTerm) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      itemId.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().replace(/\s+/g, '_').includes(searchLower) ||
      item.name.toLowerCase().replace(/_/g, ' ').includes(searchLower)
    );
  }).map(([itemId, item]) => ({ ...item, itemId }));

  // Get actual popular items from the database - first 20 items for testing
  const getPopularItems = () => {
    const allItemIds = Object.keys(items);
    const popularIds = allItemIds.slice(0, 20); // Get first 20 items as popular for now
    return popularIds.filter(itemId => items[itemId]);
  };

  const popularItems = getPopularItems();

  return (
    <div className="space-y-6">
      {/* Header & Create Project */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Project Management</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create Project'}
          </button>
        </div>

        {showCreateForm && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="Enter project description..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Create Project
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-slate-600 text-sm mt-4">
          Create named projects and add BitCraft items to them. Tasks will be generated automatically based on the items in your project.
        </p>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Projects</h3>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {projects.length} projects
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🏗️</div>
            <p className="text-slate-500 text-lg">No projects created yet</p>
            <p className="text-slate-400 text-sm mt-2">Create projects to organize your settlement goals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const progress = getProjectProgress(project.id);
              const projectTasks = getProjectTasks(project.id);
              const materials = getProjectMaterials(items, project.id);

              return (
                <div key={project.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 text-lg">
                        {project.name}
                      </h4>
                      {project.description && (
                        <p className="text-slate-600 text-sm mt-1">{project.description}</p>
                      )}
                      <p className="text-slate-500 text-xs mt-1">
                        Created {new Date(project.dateCreated).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Items */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Items ({project.items.length})</h4>
                      <button
                        onClick={() => setShowAddItemForm(project.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        ➕ Add Item
                      </button>
                    </div>
                    
                    {project.items.length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-sm">No items added yet</p>
                        <p className="text-gray-400 text-xs mt-1">Click "Add Item" to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {project.items.map((item) => (
                          <div key={item.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                              <span className="font-medium">{item.targetQuantity}x {item.itemName}</span>
                              <div className="text-xs text-gray-600 mt-1">
                                Progress: {item.completedQuantity}/{item.targetQuantity}
                                <span className="ml-2 text-blue-600">
                                  ({Math.round((item.completedQuantity / item.targetQuantity) * 100)}%)
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveItemFromProject(project.id, item.itemId)}
                              className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-sm transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Item Form */}
                  {showAddItemForm === project.id && (
                    <div className="mb-4 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-800">Add Item to Project</h4>
                        <button
                          onClick={() => setShowAddItemForm(null)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Search Items</label>
                          <input
                            type="text"
                            placeholder="Search for items by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Type at least 2 characters to search through {Object.keys(items).length} items
                          </p>
                        </div>

                        {!searchTerm && popularItems.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium mb-2">🌟 Sample Items (First 20 from database)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {popularItems.map(itemId => {
                                const item = items[itemId];
                                return (
                                  <button
                                    key={itemId}
                                    onClick={() => setSelectedItemId(itemId)}
                                    className={`px-3 py-2 text-sm rounded border text-left ${
                                      selectedItemId === itemId 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white border-gray-300 hover:bg-gray-50'
                                    }`}
                                    title={`Item ID: ${itemId}`}
                                  >
                                    {item.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium mb-1">Select Item</label>
                          <select
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">
                              {searchTerm && searchTerm.length < 2 ? 'Type at least 2 characters to search' :
                               searchTerm ? 
                                 (filteredItems.length > 0 ? `Choose from ${filteredItems.length} search results...` : 'No items found - try a different search') :
                                 'Search for items above or select from sample items'
                              }
                            </option>
                            {(searchTerm && searchTerm.length >= 2 ? filteredItems : []).map(item => (
                              <option key={item.itemId} value={item.itemId}>
                                {item.name} (Tier {item.tier})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={selectedQuantity}
                            onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {selectedItemId && items[selectedItemId]?.recipes && items[selectedItemId].recipes.length > 1 && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Recipe</label>
                            <select
                              value={selectedRecipeIndex}
                              onChange={(e) => setSelectedRecipeIndex(parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {items[selectedItemId].recipes.map((recipe, index) => (
                                <option key={index} value={index}>
                                  Recipe {index + 1}: {recipe.building_requirement || 'No building required'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddItemToProject(project.id)}
                            disabled={!selectedItemId || selectedQuantity <= 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Add Item
                          </button>
                          <button
                            onClick={() => {
                              setShowAddItemForm(null);
                              setSearchTerm('');
                              setSelectedItemId('');
                              setSelectedQuantity(1);
                              setSelectedRecipeIndex(0);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate Tasks Button */}
                  {project.items.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => handleGenerateTasksForProject(project.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        🔧 Generate Tasks ({project.items.length} items)
                      </button>
                      <p className="text-sm text-gray-600 mt-1">
                        This will create tasks for all items in the project
                      </p>
                    </div>
                  )}

                  {/* Tasks Summary */}
                  {projectTasks.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Tasks ({projectTasks.length})</h4>
                      <div className="text-sm text-gray-600">
                        <span className="text-green-600">
                          {projectTasks.filter(t => t.status === 'completed').length} completed
                        </span>
                        {' • '}
                        <span className="text-blue-600">
                          {projectTasks.filter(t => t.status === 'in_progress').length} in progress
                        </span>
                        {' • '}
                        <span className="text-gray-600">
                          {projectTasks.filter(t => t.status === 'planned').length} planned
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Material Requirements */}
                  {materials.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Material Requirements</h4>
                      <div className="space-y-1">
                        {materials.slice(0, 5).map((material) => (
                          <div key={material.itemId} className="flex justify-between text-sm">
                            <span>{material.itemName}</span>
                            <div className="flex items-center gap-2">
                              {material.inInventory > 0 && (
                                <span className="text-green-600 text-xs">
                                  {material.inInventory} have
                                </span>
                              )}
                              {material.stillNeeded > 0 ? (
                                <span className="text-gray-600">
                                  {material.stillNeeded} needed
                                  {material.isBaseItem && <span className="text-orange-600 ml-1">(Gather)</span>}
                                </span>
                              ) : (
                                <span className="text-green-600 text-xs">✓ Complete</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {materials.length > 5 && (
                          <div className="text-xs text-gray-500">
                            + {materials.length - 5} more materials
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned Players */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2">Assigned Players</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.assignedPlayers.map((playerId) => {
                        const player = players.find(p => p.id === playerId);
                        if (!player) return null;
                        return (
                          <span
                            key={playerId}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                          >
                            {player.name}
                            <button
                              onClick={() => handleAssignPlayers(project.id, 
                                project.assignedPlayers.filter(id => id !== playerId)
                              )}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignPlayers(project.id, [...project.assignedPlayers, e.target.value]);
                            e.target.value = '';
                          }
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Assign Player</option>
                        {players
                          .filter(player => !project.assignedPlayers.includes(player.id))
                          .map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Project Controls */}
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2 text-sm">
                      <select
                        value={project.priority}
                        onChange={(e) => updateProject(project.id, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <select
                        value={project.status}
                        onChange={(e) => updateProject(project.id, { status: e.target.value as any })}
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this project and all its tasks?')) {
                          // Release reserved materials before deleting
                          releaseMaterialsForProject(items, project.id);
                          deleteProject(project.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagement; 