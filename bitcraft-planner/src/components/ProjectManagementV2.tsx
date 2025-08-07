import React, { useState, useEffect } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { SettlementV2Service, ProjectV2, TaskV2, SettlementV2 } from '../services/settlementV2Service';
import { calculateMaterials, MaterialRequirement } from '../utils/calculator';
import { generateTasksForProject } from '../utils/settlementIntegration';
import { ItemsData } from '../types/Item';

interface ProjectManagementV2Props {
  settlementService: SettlementV2Service;
  currentSettlement: SettlementV2 | null;
  projects: ProjectV2[];
  onProjectsUpdate: () => void;
}

interface ItemSelectionModal {
  show: boolean;
  projectId: string;
}

interface CalculatedMaterials {
  baseMaterials: MaterialRequirement[];
  intermediateMaterials: MaterialRequirement[];
  totalMaterials: MaterialRequirement[];
}

const ProjectManagementV2: React.FC<ProjectManagementV2Props> = ({ 
  settlementService, 
  currentSettlement, 
  projects, 
  onProjectsUpdate 
}) => {
  const { items } = useItemsStore();
  const [itemSelection, setItemSelection] = useState<ItemSelectionModal>({ show: false, projectId: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [calculatedMaterials, setCalculatedMaterials] = useState<CalculatedMaterials | null>(null);
  const [showMaterialsPreview, setShowMaterialsPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter items based on search term
  const filteredItems = Object.entries(items).filter(([id, item]) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    id.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 50); // Limit results for performance

  // Calculate materials when item/quantity/recipe changes
  useEffect(() => {
    if (selectedItemId && selectedQuantity > 0 && items[selectedItemId]) {
      const calculation = calculateMaterials(items, selectedItemId, selectedQuantity, selectedRecipeIndex);
      setCalculatedMaterials({
        baseMaterials: calculation.baseMaterials,
        intermediateMaterials: calculation.intermediateMaterials,
        totalMaterials: calculation.totalMaterials
      });
    } else {
      setCalculatedMaterials(null);
    }
  }, [selectedItemId, selectedQuantity, selectedRecipeIndex, items]);

  const handleAddItemToProject = async (projectId: string) => {
    if (!selectedItemId || selectedQuantity <= 0 || !items[selectedItemId]) return;
    
    try {
      setLoading(true);
      const item = items[selectedItemId];
      
      // Get current project
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Add item to project
      const updatedItems = [...project.items, {
        itemId: selectedItemId,
        itemName: item.name,
        targetQuantity: selectedQuantity,
        completedQuantity: 0,
        recipeIndex: selectedRecipeIndex
      }];

      await settlementService.updateProject(projectId, {
        items: updatedItems,
        status: project.status === 'not_started' ? 'in_progress' : project.status
      });

      // Auto-generate tasks based on the new item
      await generateTasksForNewItem(projectId, selectedItemId, selectedQuantity, selectedRecipeIndex);

      // Reset form
      setSelectedItemId('');
      setSelectedQuantity(1);
      setSelectedRecipeIndex(0);
      setSearchTerm('');
      setCalculatedMaterials(null);
      setItemSelection({ show: false, projectId: '' });
      
      // Refresh projects
      onProjectsUpdate();
    } catch (error) {
      console.error('Error adding item to project:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTasksForNewItem = async (projectId: string, itemId: string, quantity: number, recipeIndex: number) => {
    try {
      // Convert current settlement inventory to the format expected by settlementIntegration
      const settlementInventory = currentSettlement ? 
        Object.fromEntries(
          Object.entries(currentSettlement.inventory).map(([id, inv]) => [
            id, 
            {
              itemId: id,
              itemName: items[id]?.name || 'Unknown',
              quantity: inv.quantity,
              reservedQuantity: inv.reservedQuantity,
              storageLocation: inv.storageLocation,
              lastUpdated: new Date() // Convert Timestamp to Date if needed
            }
          ])
        ) : {};

      // Use the existing settlement integration logic to generate tasks
      const projectData = {
        id: projectId,
        name: 'temp',
        description: 'temp',
        items: [{
          itemId,
          itemName: items[itemId]?.name || 'Unknown',
          targetQuantity: quantity,
          completedQuantity: 0,
          recipeIndex
        }],
        assignedPlayers: [],
        priority: 'medium' as const,
        status: 'in_progress' as const,
        progressPercentage: 0,
        dateCreated: new Date()
      };

      const { tasks } = generateTasksForProject(items as ItemsData, projectData, settlementInventory);

      // Create tasks in Firebase
      for (const taskData of tasks) {
        await settlementService.createTask({
          projectId,
          title: `${taskData.type === 'craft' ? 'Craft' : 'Gather'} ${taskData.targetQuantity}x ${taskData.itemName}`,
          description: taskData.buildingRequirement ? 
            `${taskData.type === 'craft' ? 'Craft' : 'Gather'} ${taskData.targetQuantity}x ${taskData.itemName} using ${taskData.buildingRequirement}` :
            `${taskData.type === 'craft' ? 'Craft' : 'Gather'} ${taskData.targetQuantity}x ${taskData.itemName}`,
          status: 'pending',
          priority: 'medium',
          metadata: {
            ...(taskData.itemId && { itemId: taskData.itemId }),
            ...(taskData.itemName && { itemName: taskData.itemName }),
            ...(taskData.targetQuantity !== undefined && { targetQuantity: taskData.targetQuantity }),
            ...(taskData.completedQuantity !== undefined && { completedQuantity: taskData.completedQuantity }),
            ...(taskData.isBaseItem !== undefined && { isBaseItem: taskData.isBaseItem }),
            ...(taskData.buildingRequirement && { buildingRequirement: taskData.buildingRequirement }),
            ...(taskData.type && { taskType: taskData.type }),
            ...(taskData.recipeIndex !== undefined && { recipeIndex: taskData.recipeIndex })
          }
        });
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) {
      return;
    }
    
    try {
      await settlementService.deleteProject(projectId);
      onProjectsUpdate();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, status: ProjectV2['status']) => {
    try {
      await settlementService.updateProject(projectId, { status });
      onProjectsUpdate();
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No projects found. Create your first project to get started!
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{project.description}</p>
                  <div className="flex gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      {project.items.length} items
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {project.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select 
                    value={project.status}
                    onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value as ProjectV2['status'])}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button 
                    onClick={() => setItemSelection({ show: true, projectId: project.id })}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    + Add Item
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(project.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {/* Rename project */}
              <div className="mt-2">
                <details>
                  <summary className="text-sm text-gray-600 cursor-pointer">Rename / Edit Description</summary>
                  <ProjectRenameEdit project={project} settlementService={settlementService} onProjectsUpdate={onProjectsUpdate} />
                </details>
              </div>

              {/* Project Items */}
              {project.items.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium mb-2">Project Items:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {project.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-sm">{item.itemName}</div>
                        <div className="text-xs text-gray-600">
                          Quantity: {item.targetQuantity} (completed: {item.completedQuantity})
                        </div>
                        {item.recipeIndex > 0 && (
                          <div className="text-xs text-blue-600">
                            Recipe #{item.recipeIndex + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {itemSelection.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add Item to Project</h3>
            
            {/* Item Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Items
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search for items..."
              />
            </div>

            {/* Item List */}
            {searchTerm && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded">
                {filteredItems.map(([id, item]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedItemId(id);
                      setSearchTerm(item.name);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 ${
                      selectedItemId === id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">Tier {item.tier} • Rarity {item.rarity}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItemId && items[selectedItemId] && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Selected: {items[selectedItemId].name}</h4>
                
                {/* Quantity Input */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Recipe Selection */}
                {items[selectedItemId].recipes && items[selectedItemId].recipes.length > 1 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipe
                    </label>
                    <select
                      value={selectedRecipeIndex}
                      onChange={(e) => setSelectedRecipeIndex(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {items[selectedItemId].recipes.map((recipe, index) => (
                        <option key={index} value={index}>
                          Recipe {index + 1} - Output: {recipe.output_quantity}
                          {recipe.building_requirement && ` (${recipe.building_requirement})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Materials Preview */}
                {calculatedMaterials && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowMaterialsPreview(!showMaterialsPreview)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {showMaterialsPreview ? '▼' : '▶'} Preview Required Materials ({calculatedMaterials.totalMaterials.length} total)
                    </button>
                    
                    {showMaterialsPreview && (
                      <div className="mt-2 space-y-2">
                        {calculatedMaterials.baseMaterials.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm text-green-700">Base Materials ({calculatedMaterials.baseMaterials.length}):</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                              {calculatedMaterials.baseMaterials.map((mat, idx) => (
                                <div key={idx} className="bg-green-50 p-1 rounded">
                                  {mat.quantity}x {mat.itemName}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {calculatedMaterials.intermediateMaterials.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm text-blue-700">Intermediate Materials ({calculatedMaterials.intermediateMaterials.length}):</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                              {calculatedMaterials.intermediateMaterials.map((mat, idx) => (
                                <div key={idx} className="bg-blue-50 p-1 rounded">
                                  {mat.quantity}x {mat.itemName}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleAddItemToProject(itemSelection.projectId)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                disabled={!selectedItemId || selectedQuantity <= 0 || loading}
              >
                {loading ? 'Adding...' : 'Add Item & Generate Tasks'}
              </button>
              <button
                onClick={() => {
                  setItemSelection({ show: false, projectId: '' });
                  setSelectedItemId('');
                  setSelectedQuantity(1);
                  setSelectedRecipeIndex(0);
                  setSearchTerm('');
                  setCalculatedMaterials(null);
                  setShowMaterialsPreview(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementV2; 

// Inline sub-component for renaming/editing a project
const ProjectRenameEdit: React.FC<{ project: ProjectV2; settlementService: SettlementV2Service; onProjectsUpdate: () => void }>
 = ({ project, settlementService, onProjectsUpdate }) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settlementService.updateProject(project.id, { name: name.trim(), description: description });
      onProjectsUpdate();
    } finally { setSaving(false); }
  };

  return (
    <div className="p-3 bg-gray-50 rounded border mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};