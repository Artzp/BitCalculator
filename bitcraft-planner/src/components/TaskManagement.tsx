import React, { useState } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useItemsStore } from '../state/useItemsStore';

export const TaskManagement: React.FC = () => {
  const { settlement, updateTask, assignTaskToPlayer, completeTask, getAvailableTasks } = useSettlementStore();
  const { items } = useItemsStore();
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  if (!settlement) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="text-gray-500 text-lg">No settlement data available</div>
        </div>
      </div>
    );
  }

  const tasks = settlement.tasks;
  const projects = settlement.projects;
  const players = settlement.players;

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterType !== 'all' && task.type !== filterType) return false;
    if (filterProject !== 'all' && task.projectId !== filterProject) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gather': return 'bg-orange-100 text-orange-700';
      case 'craft': return 'bg-purple-100 text-purple-700';
      case 'collect': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleCompleteTask = (taskId: string, completedQuantity: number) => {
    completeTask(taskId, completedQuantity);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getPlayerName = (playerId?: string) => {
    if (!playerId) return 'Unassigned';
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  // Task summary stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const plannedTasks = tasks.filter(t => t.status === 'planned').length;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Task Management</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {totalTasks} total tasks
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{plannedTasks}</div>
            <div className="text-sm text-gray-700">Planned</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <div className="text-sm text-blue-700">In Progress</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((completedTasks / totalTasks) * 100) || 0}%
            </div>
            <div className="text-sm text-purple-700">Progress</div>
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          Tasks are automatically generated from your projects. Complete tasks to track settlement progress.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Filter Tasks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="gather">Gather</option>
              <option value="craft">Craft</option>
              <option value="collect">Collect</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredTasks.length} of {totalTasks} tasks
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Tasks</h3>
        
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <p className="text-slate-500 text-lg">No tasks match your filters</p>
            <p className="text-slate-400 text-sm mt-2">Try adjusting your filters or create some projects first</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.slice(0, 50).map((task) => (
              <div key={task.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">
                      {task.targetQuantity}x {task.itemName}
                    </h4>
                    <p className="text-sm text-slate-600">
                      Project: {getProjectName(task.projectId)}
                    </p>
                    {task.buildingRequirement && (
                      <p className="text-xs text-orange-600">
                        Requires: {task.buildingRequirement}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(task.type)}`}>
                      {task.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{task.completedQuantity}/{task.targetQuantity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((task.completedQuantity / task.targetQuantity) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Task Controls */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Assigned: {getPlayerName(task.assignedPlayerId)}
                  </div>
                  
                  {task.status !== 'completed' && (
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={task.targetQuantity}
                        value={task.completedQuantity}
                        onChange={(e) => handleCompleteTask(task.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Done"
                      />
                      <button
                        onClick={() => handleCompleteTask(task.id, task.targetQuantity)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredTasks.length > 50 && (
              <div className="text-center py-4">
                <p className="text-gray-500">Showing first 50 tasks. Use filters to narrow results.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 