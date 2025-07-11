import React, { useState, useEffect } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { Task, Player, TaskAssignment } from '../types/Settlement';
import { useAuth } from '../hooks/useAuth';
import { getMemberDisplayName } from '../utils/userUtils';
import { SettlementV2, ProjectV2, TaskV2 } from '../services/settlementV2Service';
import { SettlementMember } from '../types/NormalizedDatabase';

const professions = [
  "Forestry", "Mining", "Foraging", "Hunting", "Fishing", "Farming",
  "Carpentry", "Masonry", "Smithing", "Leatherworking", "Tailoring", "Scholar"
];

interface TaskAssignmentInterfaceProps {
  onClose: () => void;
  currentSettlement?: SettlementV2 | null;
  tasks?: TaskV2[];
  projects?: ProjectV2[];
  settlementMembers?: SettlementMember[];
}

interface PlayerWorkload {
  playerId: string;
  playerName: string;
  activeTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  estimatedHours: number;
  taskTypes: { [type: string]: number };
  lastActive?: Date;
  skillAreas: string[];
}

interface AssignmentTemplate {
  id: string;
  name: string;
  description: string;
  pattern: {
    taskType?: string;
    preferredPlayers?: string[];
    maxTasksPerPlayer?: number;
    balanceWorkload?: boolean;
  };
}

interface SmartSuggestion {
  playerId: string;
  playerName: string;
  score: number;
  reasons: string[];
  warnings?: string[];
}

export const TaskAssignmentInterface: React.FC<TaskAssignmentInterfaceProps> = ({ 
  onClose, 
  currentSettlement, 
  tasks = [], 
  projects = [], 
  settlementMembers = [] 
}) => {
  const { user } = useAuth();
  const { settlement, updateTask, addTaskAssignment } = useSettlementStore();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]); // For bulk assignment
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('unassigned');
  const [loading, setLoading] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Advanced assignment features
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk' | 'template'>('single');
  const [playerWorkloads, setPlayerWorkloads] = useState<PlayerWorkload[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [autoBalance, setAutoBalance] = useState(false);
  const [maxTasksPerPlayer, setMaxTasksPerPlayer] = useState<number>(5);
  const [prioritizeSkillMatch, setPrioritizeSkillMatch] = useState(true);
  const [considerWorkload, setConsiderWorkload] = useState(true);
  const [estimatedHours, setEstimatedHours] = useState<number>(2);

  // Predefined assignment templates
  const assignmentTemplates: AssignmentTemplate[] = [
    {
      id: 'balanced',
      name: 'Balanced Distribution',
      description: 'Distribute tasks evenly among all available players',
      pattern: { balanceWorkload: true, maxTasksPerPlayer: 3 }
    },
    {
      id: 'skill_based',
      name: 'Skill-Based Assignment',
      description: 'Assign tasks based on player skills and specializations',
      pattern: { taskType: 'craft' }
    },
    {
      id: 'urgent_priority',
      name: 'Urgent Task Priority',
      description: 'Assign urgent tasks to most available players',
      pattern: { maxTasksPerPlayer: 2 }
    },
    {
      id: 'gathering_focus',
      name: 'Gathering Specialists',
      description: 'Prioritize gathering tasks for resource specialists',
      pattern: { taskType: 'gather' }
    }
  ];

  // Calculate workload when data changes
  useEffect(() => {
    if (tasks.length > 0 && settlementMembers.length > 0) {
      calculatePlayerWorkloads(tasks, settlementMembers);
    }
  }, [tasks, settlementMembers]);

  // Calculate workload for each player
  const calculatePlayerWorkloads = (tasksList: TaskV2[], members: SettlementMember[]) => {
    const workloads: PlayerWorkload[] = members.map(member => {
      const playerId = member.collaboration?.userId || member.user?.id;
      const playerTasks = tasksList.filter(task => task.assignedTo === playerId);
      
      const activeTasks = playerTasks.filter(task => task.status === 'in_progress').length;
      const pendingTasks = playerTasks.filter(task => task.status === 'pending').length;
      const overdueTasks = playerTasks.filter(task => 
        task.dueDate && new Date(task.dueDate.seconds * 1000) < new Date()
      ).length;
      
      // Calculate task types
      const taskTypes: { [type: string]: number } = {};
      playerTasks.forEach(task => {
        const type = task.metadata?.taskType || 'general';
        taskTypes[type] = (taskTypes[type] || 0) + 1;
      });
      
      // Estimate skill areas based on task history
      const skillAreas: string[] = [];
      if (taskTypes.craft > taskTypes.gather) skillAreas.push('Crafting');
      if (taskTypes.gather > 0) skillAreas.push('Gathering');
      if (activeTasks > 2) skillAreas.push('High Capacity');
      
      return {
        playerId,
        playerName: getMemberDisplayName(member),
        activeTasks,
        pendingTasks,
        overdueTasks,
        estimatedHours: (activeTasks * 2) + (pendingTasks * 1.5), // Rough estimate
        taskTypes,
        skillAreas
      };
    });
    
    setPlayerWorkloads(workloads);
  };

  // Generate smart assignment suggestions
  const generateSmartSuggestions = (task: any) => {
    if (!task || playerWorkloads.length === 0) return;
    
    const suggestions: SmartSuggestion[] = playerWorkloads.map(workload => {
      let score = 100; // Base score
      const reasons: string[] = [];
      const warnings: string[] = [];
      
      // Workload factor
      if (considerWorkload) {
        if (workload.activeTasks === 0) {
          score += 20;
          reasons.push('No active tasks - fully available');
        } else if (workload.activeTasks <= 2) {
          score += 10;
          reasons.push('Light workload');
        } else if (workload.activeTasks >= 4) {
          score -= 15;
          warnings.push('Heavy workload');
        }
        
        if (workload.overdueTasks > 0) {
          score -= 25;
          warnings.push(`${workload.overdueTasks} overdue task${workload.overdueTasks > 1 ? 's' : ''}`);
        }
      }
      
      // Skill matching
      if (prioritizeSkillMatch && task.metadata?.taskType) {
        const taskType = task.metadata.taskType;
        if (workload.taskTypes[taskType] > 0) {
          score += 15;
          reasons.push(`Experience with ${taskType} tasks`);
        }
        
        if (taskType === 'craft' && workload.skillAreas.includes('Crafting')) {
          score += 10;
          reasons.push('Crafting specialist');
        } else if (taskType === 'gather' && workload.skillAreas.includes('Gathering')) {
          score += 10;
          reasons.push('Gathering specialist');
        }
      }
      
      // Building requirement access (simplified - could be enhanced with actual access data)
      if (task.metadata?.buildingRequirement) {
        score += 5;
        reasons.push('Has building access');
      }
      
      // Random factor for variety
      score += Math.random() * 10 - 5;
      
      return {
        playerId: workload.playerId,
        playerName: workload.playerName,
        score: Math.max(0, Math.min(100, score)),
        reasons: reasons.slice(0, 3), // Limit to top 3 reasons
        warnings: warnings.slice(0, 2) // Limit to top 2 warnings
      };
    });
    
    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);
    setSmartSuggestions(suggestions.slice(0, 5)); // Top 5 suggestions
  };

  // Update suggestions when task changes
  useEffect(() => {
    if (selectedTask && showAdvancedOptions) {
      generateSmartSuggestions(selectedTask);
    }
  }, [selectedTask, playerWorkloads, considerWorkload, prioritizeSkillMatch, showAdvancedOptions]);

  // Bulk task selection
  const handleTaskSelect = (taskId: string) => {
    if (assignmentMode === 'bulk') {
      setSelectedTasks(prev => 
        prev.includes(taskId) 
          ? prev.filter(id => id !== taskId)
          : [...prev, taskId]
      );
    } else {
      const task = tasks.find(t => t.id === taskId);
      setSelectedTask(task);
    }
  };

  // Apply assignment template
  const applyTemplate = () => {
    const template = assignmentTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    if (template.pattern.balanceWorkload) {
      setAutoBalance(true);
      setMaxTasksPerPlayer(template.pattern.maxTasksPerPlayer || 3);
    }
    
    // Auto-select players based on template
    if (template.pattern.preferredPlayers) {
      setSelectedPlayers(template.pattern.preferredPlayers);
    } else if (template.pattern.balanceWorkload) {
      // Select players with lowest workload
      const sortedPlayers = playerWorkloads
        .sort((a, b) => a.activeTasks - b.activeTasks)
        .slice(0, 3)
        .map(p => p.playerId);
      setSelectedPlayers(sortedPlayers);
    }
  };

  // Auto-assign based on smart suggestions
  const autoAssignBest = () => {
    if (smartSuggestions.length > 0) {
      setSelectedPlayers([smartSuggestions[0].playerId]);
    }
  };

  if (!user || loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  // Filter V2 tasks based on assignment status and search
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.metadata?.itemName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'unassigned' && !task.assignedTo) ||
                         (filterStatus === 'assigned' && task.assignedTo) ||
                         task.status === filterStatus;
    
    const matchesProject = !selectedProject || task.projectId === selectedProject;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Use real settlement members
  const availablePlayers = settlementMembers.map(member => ({
    id: member.collaboration?.userId || member.user?.id,
    name: getMemberDisplayName(member),
    isActive: member.collaboration?.status === 'active' || true
  }));

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAssignTask = async () => {
    if (assignmentMode === 'bulk') {
      return handleBulkAssignment();
    }
    
    if (!selectedTask || selectedPlayers.length === 0 || !user) return;

    try {
      // For single task assignment
      const playerId = selectedPlayers[0];
      
      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      // Update V2 task with assignment
      const updateData: any = {
        assignedTo: playerId,
        status: 'pending'
      };
      
      if (deadline) {
        // Convert to Firestore Timestamp
        const { Timestamp } = await import('firebase/firestore');
        updateData.dueDate = Timestamp.fromDate(new Date(deadline));
      }
      
      if (notes) {
        updateData.assignmentNotes = notes;
      }
      
      await settlementService.updateTask(selectedTask.id, updateData);

      // No need to call reloadTaskData here as tasks are passed as props
      
      // Reset form
      setSelectedTask(null);
      setSelectedPlayers([]);
      setDeadline('');
      setNotes('');
      
      console.log(`Task "${selectedTask.title}" assigned to player ${playerId}`);
      
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedTasks.length === 0 || selectedPlayers.length === 0 || !user) return;

    try {
      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      // Auto-balance workload if enabled
      let playerAssignments: { [taskId: string]: string } = {};
      
      if (autoBalance) {
        // Distribute tasks evenly among selected players
        const playersWithWorkload = selectedPlayers.map(playerId => {
          const workload = playerWorkloads.find(w => w.playerId === playerId);
          return {
            playerId,
            currentTasks: workload?.activeTasks || 0
          };
        }).sort((a, b) => a.currentTasks - b.currentTasks);
        
        selectedTasks.forEach((taskId, index) => {
          const playerIndex = index % playersWithWorkload.length;
          playerAssignments[taskId] = playersWithWorkload[playerIndex].playerId;
        });
      } else {
        // Assign all tasks to the first selected player
        const primaryPlayer = selectedPlayers[0];
        selectedTasks.forEach(taskId => {
          playerAssignments[taskId] = primaryPlayer;
        });
      }
      
      // Apply assignments
      for (const [taskId, playerId] of Object.entries(playerAssignments)) {
        const updateData: any = {
          assignedTo: playerId,
          status: 'pending'
        };
        
        if (deadline) {
          const { Timestamp } = await import('firebase/firestore');
          updateData.dueDate = Timestamp.fromDate(new Date(deadline));
        }
        
        if (notes) {
          updateData.assignmentNotes = notes;
        }
        
        await settlementService.updateTask(taskId, updateData);
      }

      // No need to call reloadTaskData here as tasks are passed as props

      // Reset form
      setSelectedTasks([]);
      setSelectedPlayers([]);
      setDeadline('');
      setNotes('');
      
      console.log(`Bulk assigned ${selectedTasks.length} tasks to ${selectedPlayers.length} player(s)`);
      
    } catch (error) {
      console.error('Error bulk assigning tasks:', error);
    }
  };

  const reloadTaskData = async () => {
    // This function is no longer needed as tasks are passed as props
  };

  const handleClearSelection = () => {
    setSelectedTask(null);
    setSelectedTasks([]);
    setSelectedPlayers([]);
    setDeadline('');
    setNotes('');
    setSelectedTemplate('');
  };

  const selectAllUnassignedTasks = () => {
    const unassignedTasks = filteredTasks.filter(task => !task.assignedTo).map(task => task.id);
    setSelectedTasks(unassignedTasks);
  };

  const selectTasksByType = (taskType: string) => {
    const typedTasks = filteredTasks.filter(task => 
      task.metadata?.taskType === taskType
    ).map(task => task.id);
    setSelectedTasks(typedTasks);
  };

  const getPlayerName = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    return player ? player.name : playerId; // Show user ID if name not found
  };

  const getAssigneeNames = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) return 'Unassigned';
    return task.assignedTo.map(id => getPlayerName(id)).join(', ');
  };

  // Helper function to get inventory status for a task
  const getInventoryStatus = (task: any) => {
    if (!currentSettlement?.inventory || !task.metadata?.itemId || !task.metadata?.targetQuantity) {
      return null;
    }
    
    const itemId = task.metadata.itemId;
    const needed = parseInt(task.metadata.targetQuantity) || 0;
    const inventoryItem = currentSettlement.inventory[itemId];
    const available = inventoryItem ? (inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)) : 0;
    
    return {
      available,
      needed,
      itemName: task.metadata.itemName,
      isEnough: available >= needed,
      shortage: Math.max(0, needed - available)
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Task Assignment Interface</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100 mt-2">Assign tasks to settlement members for collaborative work</p>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Task List */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Available Tasks ({filteredTasks.length} of {tasks.length})
                  {assignmentMode === 'bulk' && selectedTasks.length > 0 && (
                    <span className="ml-2 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                      {selectedTasks.length} selected
                    </span>
                  )}
                </h3>
                {assignmentMode === 'bulk' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedTasks(filteredTasks.map(t => t.id))}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      Select All Visible
                    </button>
                    <button
                      onClick={() => setSelectedTasks([])}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
              
              {/* Filters */}
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="flex space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Tasks</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  
                  {showAdvancedOptions && (
                    <select
                      onChange={(e) => {
                        const priority = e.target.value;
                        if (priority === 'all') {
                          // Show all tasks
                        } else {
                          // Could add priority filtering here
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Priorities</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Task Type Filter Pills */}
              {showAdvancedOptions && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-gray-500 font-medium">Quick Filters:</span>
                  {['craft', 'gather', 'collect'].map(type => {
                    const count = tasks.filter(task => task.metadata?.taskType === type).length;
                    return count > 0 ? (
                      <button
                        key={type}
                        onClick={() => {
                          if (assignmentMode === 'bulk') {
                            selectTasksByType(type);
                          }
                        }}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                      >
                        {type} ({count})
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleTaskSelect(task.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    assignmentMode === 'bulk' && selectedTasks.includes(task.id)
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : selectedTask?.id === task.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      {assignmentMode === 'bulk' && (
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTaskSelect(task.id);
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      )}
                      <h4 className="font-semibold text-gray-800">
                        {task.metadata?.targetQuantity ? `${task.metadata.targetQuantity}x ` : ''}{task.metadata?.itemName || task.title}
                      </h4>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      !task.assignedTo ? 'bg-gray-100 text-gray-700' :
                      task.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {!task.assignedTo ? 'unassigned' : task.status}
                    </span>
                  </div>
                  
                  {/* Inventory Status */}
                  {(() => {
                    const inventoryStatus = getInventoryStatus(task);
                    return inventoryStatus ? (
                      <div className={`text-xs px-2 py-1 rounded mb-2 ${
                        inventoryStatus.isEnough 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        📦 Inventory: {inventoryStatus.available}/{inventoryStatus.needed} available
                        {!inventoryStatus.isEnough && (
                          <span className="font-medium"> • Need {inventoryStatus.shortage} more</span>
                        )}
                        {inventoryStatus.isEnough && (
                          <span className="font-medium"> ✅ Ready to complete</span>
                        )}
                      </div>
                    ) : null;
                  })()}
                  
                  <p className="text-sm text-gray-600 mb-1">
                    Project: {projects.find(p => p.id === task.projectId)?.name || 'Unknown'}
                  </p>
                  
                  <p className="text-sm text-gray-500">
                    Assigned to: {task.assignedTo || 'Unassigned'}
                  </p>
                  
                  {task.dueDate && (
                    <p className="text-xs text-orange-600 mt-1">
                      Deadline: {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Assignment Panel */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {selectedTask || (assignmentMode === 'bulk' && selectedTasks.length > 0) ? (
              <div>
                {/* Assignment Mode Selector */}
                <div className="mb-4">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg font-semibold">Assignment Mode</h3>
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        showAdvancedOptions 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      ⚙️ Advanced Options
                    </button>
                  </div>
                  
                  <div className="flex space-x-2 mb-4">
                    {[
                      { id: 'single', label: '👤 Single Task', desc: 'Assign one task at a time' },
                      { id: 'bulk', label: '📦 Bulk Assignment', desc: 'Assign multiple tasks together' },
                      { id: 'template', label: '📋 Use Template', desc: 'Apply predefined patterns' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setAssignmentMode(mode.id as any)}
                        className={`flex-1 p-3 text-sm rounded-lg border transition-all ${
                          assignmentMode === mode.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Options Panel */}
                {showAdvancedOptions && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                    <h4 className="font-semibold text-gray-800">🎯 Smart Assignment Options</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={considerWorkload}
                          onChange={(e) => setConsiderWorkload(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Consider Player Workload</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={prioritizeSkillMatch}
                          onChange={(e) => setPrioritizeSkillMatch(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Prioritize Skill Match</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={autoBalance}
                          onChange={(e) => setAutoBalance(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Auto-Balance Workload</span>
                      </label>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">Max Tasks/Player:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={maxTasksPerPlayer}
                          onChange={(e) => setMaxTasksPerPlayer(parseInt(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    {selectedTask && (
                      <button
                        onClick={autoAssignBest}
                        className="w-full bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 transition-colors text-sm"
                      >
                        🤖 Auto-Assign Best Match
                      </button>
                    )}
                  </div>
                )}

                {/* Template Selector (Template Mode) */}
                {assignmentMode === 'template' && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-blue-800 mb-3">📋 Assignment Templates</h4>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                      <option value="">Select a template...</option>
                      {assignmentTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    
                    {selectedTemplate && (
                      <div className="text-sm text-blue-700 mb-3">
                        {assignmentTemplates.find(t => t.id === selectedTemplate)?.description}
                      </div>
                    )}
                    
                    <button
                      onClick={applyTemplate}
                      disabled={!selectedTemplate}
                      className="w-full bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 transition-colors text-sm"
                    >
                      Apply Template
                    </button>
                  </div>
                )}

                {/* Bulk Assignment Info */}
                {assignmentMode === 'bulk' && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-green-800 mb-2">📦 Bulk Assignment</h4>
                    <p className="text-sm text-green-700 mb-2">
                      Selected {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} for bulk assignment
                    </p>
                    <p className="text-xs text-green-600">
                      Click tasks in the left panel to select/deselect them for bulk operations
                    </p>
                  </div>
                )}

                {/* Player Workload Analysis */}
                {showAdvancedOptions && playerWorkloads.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-yellow-800 mb-3">📊 Player Workload Analysis</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {playerWorkloads.map(workload => (
                        <div key={workload.playerId} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{workload.playerName}</span>
                            <div className="text-xs text-gray-500">
                              {workload.skillAreas.join(', ') || 'General'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              Active: {workload.activeTasks} | Pending: {workload.pendingTasks}
                            </div>
                            <div className="text-xs text-gray-500">
                              ~{workload.estimatedHours.toFixed(1)}h workload
                            </div>
                            {workload.overdueTasks > 0 && (
                              <div className="text-xs text-red-600">
                                {workload.overdueTasks} overdue
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Suggestions */}
                {showAdvancedOptions && selectedTask && smartSuggestions.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-purple-800 mb-3">🎯 Smart Assignment Suggestions</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {smartSuggestions.map((suggestion, index) => (
                        <div 
                          key={suggestion.playerId} 
                          className={`p-3 bg-white rounded border cursor-pointer transition-all ${
                            selectedPlayers.includes(suggestion.playerId)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          onClick={() => {
                            if (selectedPlayers.includes(suggestion.playerId)) {
                              setSelectedPlayers(prev => prev.filter(id => id !== suggestion.playerId));
                            } else {
                              setSelectedPlayers([suggestion.playerId]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{suggestion.playerName}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                index === 0 ? 'bg-purple-100 text-purple-700' :
                                index === 1 ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {suggestion.score.toFixed(0)}% match
                              </span>
                              {index === 0 && <span className="text-yellow-500">⭐</span>}
                            </div>
                          </div>
                          <div className="text-xs text-green-600 mb-1">
                            {suggestion.reasons.slice(0, 2).join(' • ')}
                          </div>
                          {suggestion.warnings && suggestion.warnings.length > 0 && (
                            <div className="text-xs text-red-600">
                              ⚠️ {suggestion.warnings.join(' • ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Details */}
                {selectedTask && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {selectedTask.metadata?.targetQuantity ? `${selectedTask.metadata.targetQuantity}x ` : ''}{selectedTask.metadata?.itemName || selectedTask.title}
                    </h4>
                    
                    {/* Inventory Status for Selected Task */}
                    {(() => {
                      const inventoryStatus = getInventoryStatus(selectedTask);
                      return inventoryStatus ? (
                        <div className={`text-sm px-3 py-2 rounded mb-3 ${
                          inventoryStatus.isEnough 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          <div className="font-medium">📦 Inventory Status</div>
                          <div>Available: {inventoryStatus.available} / Needed: {inventoryStatus.needed}</div>
                          {inventoryStatus.isEnough ? (
                            <div className="text-green-600 font-medium">✅ Enough items available to complete this task</div>
                          ) : (
                            <div className="text-red-600 font-medium">❌ Need {inventoryStatus.shortage} more {inventoryStatus.itemName}</div>
                          )}
                        </div>
                      ) : null;
                    })()}
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Title: {selectedTask.title}</p>
                      <p>Priority: {selectedTask.priority}</p>
                      <p>Status: {selectedTask.status}</p>
                      {selectedTask.metadata?.buildingRequirement && (
                        <p>Requires: {selectedTask.metadata.buildingRequirement}</p>
                      )}
                      {selectedTask.description && (
                        <p>Description: {selectedTask.description}</p>
                      )}
                      <p>Project: {projects.find(p => p.id === selectedTask.projectId)?.name || 'Unknown'}</p>
                    </div>
                  </div>
                )}

                {/* Player Selection */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">
                    Select Players to Assign ({availablePlayers.length} available)
                    {assignmentMode === 'bulk' && ` to ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availablePlayers.map(player => {
                      const workload = playerWorkloads.find(w => w.playerId === player.id);
                      return (
                        <label key={player.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.includes(player.id)}
                            onChange={() => handlePlayerToggle(player.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <span className="text-gray-700">{player.name}</span>
                              {workload && (
                                <div className="text-xs text-gray-500">
                                  {workload.activeTasks + workload.pendingTasks} tasks • {workload.skillAreas.join(', ') || 'General'}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {selectedTask?.assignedTo?.includes(player.id) && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">
                                  Current
                                </span>
                              )}
                              {workload && workload.overdueTasks > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  {workload.overdueTasks} Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assign to all with Profession */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Assign to all with Profession</h4>
                  <select
                    value={selectedProfession}
                    onChange={(e) => {
                      const profession = e.target.value;
                      setSelectedProfession(profession);
                      if (profession) {
                        const playersWithProfession = settlementMembers
                          .filter(member => member.user?.professions?.includes(profession))
                          .map(member => member.user.id);
                        setSelectedPlayers(playersWithProfession);
                      } else {
                        setSelectedPlayers([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a Profession</option>
                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Assignment Options */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Deadline (Optional)</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Assignment Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional instructions for assigned players..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Time Estimation */}
                  {showAdvancedOptions && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Estimated Hours per Task</label>
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Helps with workload calculation and scheduling
                      </p>
                    </div>
                  )}
                </div>

                {/* Bulk Selection Controls */}
                {assignmentMode === 'bulk' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">🎯 Quick Task Selection</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={selectAllUnassignedTasks}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Select All Unassigned
                      </button>
                      <button
                        onClick={() => selectTasksByType('craft')}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
                      >
                        Select Crafting Tasks
                      </button>
                      <button
                        onClick={() => selectTasksByType('gather')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Select Gathering Tasks
                      </button>
                      <button
                        onClick={() => setSelectedTasks([])}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                      >
                        Clear Selection
                      </button>
                    </div>
                    {selectedTasks.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <strong>{selectedTasks.length}</strong> task{selectedTasks.length !== 1 ? 's' : ''} selected
                        {autoBalance && selectedPlayers.length > 1 && (
                          <span className="text-blue-600 ml-2">
                            • Will auto-balance across {selectedPlayers.length} players
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Summary */}
                {(selectedTask || selectedTasks.length > 0) && selectedPlayers.length > 0 && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-green-800 mb-2">📝 Assignment Summary</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      {assignmentMode === 'single' && selectedTask && (
                        <>
                          <p><strong>Task:</strong> {selectedTask.metadata?.itemName || selectedTask.title}</p>
                          <p><strong>Assigned to:</strong> {availablePlayers.find(p => p.id === selectedPlayers[0])?.name}</p>
                        </>
                      )}
                      {assignmentMode === 'bulk' && (
                        <>
                          <p><strong>Tasks:</strong> {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</p>
                          <p><strong>Players:</strong> {selectedPlayers.map(id => availablePlayers.find(p => p.id === id)?.name).join(', ')}</p>
                          {autoBalance && selectedPlayers.length > 1 && (
                            <p><strong>Distribution:</strong> Auto-balanced across players</p>
                          )}
                        </>
                      )}
                      {deadline && (
                        <p><strong>Deadline:</strong> {new Date(deadline).toLocaleString()}</p>
                      )}
                      {notes && (
                        <p><strong>Notes:</strong> {notes.substring(0, 50)}{notes.length > 50 ? '...' : ''}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {assignmentMode === 'single' && (
                    <button
                      onClick={handleAssignTask}
                      disabled={!selectedTask || selectedPlayers.length === 0}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Assign Task to {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
                    </button>
                  )}
                  
                  {assignmentMode === 'bulk' && (
                    <button
                      onClick={handleAssignTask}
                      disabled={selectedTasks.length === 0 || selectedPlayers.length === 0}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Bulk Assign {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''} to {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
                    </button>
                  )}
                  
                  <button
                    onClick={handleClearSelection}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                {/* Assignment Stats */}
                {showAdvancedOptions && playerWorkloads.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">📈 Assignment Impact</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="font-medium text-blue-800">Total Active Tasks</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {playerWorkloads.reduce((sum, w) => sum + w.activeTasks, 0)}
                        </div>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <div className="font-medium text-yellow-800">Estimated Workload</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {playerWorkloads.reduce((sum, w) => sum + w.estimatedHours, 0).toFixed(1)}h
                        </div>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <div className="font-medium text-red-800">Overdue Tasks</div>
                        <div className="text-2xl font-bold text-red-600">
                          {playerWorkloads.reduce((sum, w) => sum + w.overdueTasks, 0)}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <div className="font-medium text-green-800">Available Players</div>
                        <div className="text-2xl font-bold text-green-600">
                          {playerWorkloads.filter(w => w.activeTasks === 0).length}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-20">
                <div className="text-4xl mb-4">👈</div>
                <p>Select a task from the left to assign it to players</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 