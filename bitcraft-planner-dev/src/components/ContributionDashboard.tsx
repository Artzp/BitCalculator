import React, { useState, useMemo, useEffect } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { TaskContribution, Task, Player } from '../types/Settlement';
import { useAuth } from '../hooks/useAuth';

interface ContributionDashboardProps {
  onClose: () => void;
}

export const ContributionDashboard: React.FC<ContributionDashboardProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { 
    settlement, 
    getTaskContributions, 
    approveContribution, 
    rejectContribution, 
    updateTaskContribution 
  } = useSettlementStore();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'leaderboard' | 'statistics'>('pending');
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [selectedContribution, setSelectedContribution] = useState<TaskContribution | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [settlementMembers, setSettlementMembers] = useState<any[]>([]);
  const [v2Tasks, setV2Tasks] = useState<any[]>([]);
  const [v2Projects, setV2Projects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskContributions, setTaskContributions] = useState<any[]>([]);

  // Load V2 data (tasks, projects, and settlement members)
  useEffect(() => {
    const loadV2Data = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Import the settlement service dynamically
        const { SettlementV2Service } = await import('../services/settlementV2Service');
        const settlementService = new SettlementV2Service();
        
        // Get user's settlements
        const userSettlements = await settlementService.getSettlementsUserCanAccess(user.uid);
        
        if (userSettlements.length > 0) {
          const currentSettlement = userSettlements[0]; // Use first settlement
          
          // Load projects for current settlement
          const projects = await settlementService.getProjectsBySettlement(currentSettlement.id);
          setV2Projects(projects);
          
          // Load tasks for all projects
          const allTasks: any[] = [];
          for (const project of projects) {
            const projectTasks = await settlementService.getTasksByProject(project.id);
            allTasks.push(...projectTasks);
          }
          setV2Tasks(allTasks);
          
          // Load settlement members
          const members = await settlementService.getSettlementMembers(currentSettlement.id);
          setSettlementMembers(members);
          
          // Load task contributions for this settlement
          const contributions = await settlementService.getTaskContributionsBySettlement(currentSettlement.id);
          setTaskContributions(contributions);
          
          console.log(`Loaded ${allTasks.length} V2 tasks, ${projects.length} projects, ${members.length} members, and ${contributions.length} contributions for contribution dashboard`);
        }
      } catch (error) {
        console.error('Error loading V2 data for contribution dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadV2Data();
  }, [user]);

  // Filter contributions based on current filters
  const filteredContributions = useMemo(() => {
    let contributions = taskContributions;
    
    if (activeTab !== 'leaderboard' && activeTab !== 'statistics') {
      contributions = contributions.filter(c => c.status === activeTab);
    }
    
    if (selectedTask !== 'all') {
      contributions = contributions.filter(c => c.taskId === selectedTask);
    }
    
    if (selectedPlayer !== 'all') {
      contributions = contributions.filter(c => c.userId === selectedPlayer);
    }
    
    return contributions.sort((a, b) => {
      const dateA = a.submissionDate?.toDate ? a.submissionDate.toDate() : new Date(a.submissionDate);
      const dateB = b.submissionDate?.toDate ? b.submissionDate.toDate() : new Date(b.submissionDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [taskContributions, activeTab, selectedTask, selectedPlayer]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const allContributions = taskContributions;
    const approvedContributions = allContributions.filter(c => c.status === 'approved');
    const pendingCount = allContributions.filter(c => c.status === 'pending').length;
    const rejectedCount = allContributions.filter(c => c.status === 'rejected').length;
    
    // Player statistics using real settlement members
    const playerStats = settlementMembers.map((member: any) => {
      const playerContributions = allContributions.filter(c => c.userId === member.collaboration.userId);
      const approvedItems = playerContributions
        .filter(c => c.status === 'approved')
        .reduce((total, c) => total + c.itemsContributed.reduce((sum: number, item: any) => sum + item.quantity, 0), 0);
      
      return {
        player: {
          id: member.collaboration.userId,
          name: member.user.displayName || member.user.email || 'Unknown User'
        },
        totalContributions: playerContributions.length,
        approvedContributions: playerContributions.filter(c => c.status === 'approved').length,
        itemsContributed: approvedItems,
        pendingContributions: playerContributions.filter(c => c.status === 'pending').length
      };
    }).sort((a: any, b: any) => b.itemsContributed - a.itemsContributed);

    // Task statistics using V2 tasks
    const taskStats = v2Tasks.map((task: any) => {
      const taskContributions = allContributions.filter(c => c.taskId === task.id);
      const approvedItems = taskContributions
        .filter(c => c.status === 'approved')
        .reduce((total, c) => {
          return total + c.itemsContributed.reduce((sum: number, item: any) => sum + item.quantity, 0);
        }, 0);
      
      const targetQuantity = task.metadata?.targetQuantity || task.targetQuantity || 1;
      
      return {
        task: {
          id: task.id,
          targetQuantity: targetQuantity,
          itemName: task.title || task.name
        },
        totalContributions: taskContributions.length,
        itemsContributed: approvedItems,
        progressPercentage: Math.round((approvedItems / targetQuantity) * 100),
        uniqueContributors: new Set(taskContributions.map(c => c.userId)).size
      };
    }).sort((a: any, b: any) => b.progressPercentage - a.progressPercentage);

    return {
      total: allContributions.length,
      approved: approvedContributions.length,
      pending: pendingCount,
      rejected: rejectedCount,
      playerStats,
      taskStats
    };
  }, [taskContributions, settlementMembers, v2Tasks]);

  const handleApproveContribution = async (contributionId: string) => {
    if (!user) return;
    try {
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      await settlementService.approveTaskContribution(contributionId, user.uid);
      
      // Reload contributions
      const userSettlements = await settlementService.getSettlementsUserCanAccess(user.uid);
      if (userSettlements.length > 0) {
        const contributions = await settlementService.getTaskContributionsBySettlement(userSettlements[0].id);
        setTaskContributions(contributions);
      }
    } catch (error) {
      console.error('Error approving contribution:', error);
    }
  };

  const handleRejectContribution = async (contributionId: string, reason: string) => {
    if (!user) return;
    try {
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      await settlementService.rejectTaskContribution(contributionId, user.uid, reason);
      
      // Reload contributions
      const userSettlements = await settlementService.getSettlementsUserCanAccess(user.uid);
      if (userSettlements.length > 0) {
        const contributions = await settlementService.getTaskContributionsBySettlement(userSettlements[0].id);
        setTaskContributions(contributions);
      }
      
      setSelectedContribution(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting contribution:', error);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = settlementMembers.find(m => m.collaboration.userId === playerId);
    return player ? player.user.displayName || player.user.email || 'Unknown Player' : 'Unknown Player';
  };

  const getTaskName = (taskId: string) => {
    const task = v2Tasks.find(t => t.id === taskId);
    return task ? `${task.targetQuantity}x ${task.title || task.name}` : 'Unknown Task';
  };

  const getProjectName = (taskId: string) => {
    const task = v2Tasks.find(t => t.id === taskId);
    if (!task) return 'Unknown Project';
    const project = v2Projects.find(p => p.id === task.projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Early return after all hooks
  if (!settlement || !user || loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  const renderContributionsList = () => (
    <div className="space-y-4">
      {filteredContributions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-4">📊</div>
          <p>No {activeTab} contributions found</p>
        </div>
      ) : (
        filteredContributions.map(contribution => (
          <div key={contribution.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">
                  {getPlayerName(contribution.userId)}
                </h4>
                <p className="text-sm text-gray-600">{getTaskName(contribution.taskId)}</p>
                <p className="text-xs text-gray-500">{getProjectName(contribution.taskId)}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  contribution.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  contribution.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {contribution.status}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {contribution.submissionDate?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                </p>
              </div>
            </div>

            {/* Items Contributed */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Items Contributed:</p>
              <div className="grid grid-cols-2 gap-2">
                {contribution.itemsContributed.map((item: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <span className="font-medium">{item.quantity}x</span> {item.itemName}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {contribution.notes && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Notes:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{contribution.notes}</p>
              </div>
            )}

            {/* Proof of Work */}
            {contribution.proofOfWork && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Proof of Work:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{contribution.proofOfWork}</p>
              </div>
            )}

            {/* Action Buttons for Pending */}
            {contribution.status === 'pending' && (
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={() => handleApproveContribution(contribution.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => setSelectedContribution(contribution)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  ❌ Reject
                </button>
              </div>
            )}

            {/* Approval/Rejection Info */}
            {contribution.status === 'approved' && contribution.approvedBy && (
              <p className="text-xs text-green-600 mt-2">
                ✅ Approved by {getPlayerName(contribution.approvedBy)} on {contribution.approvedAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
              </p>
            )}
            {contribution.status === 'rejected' && contribution.rejectionReason && (
              <p className="text-xs text-red-600 mt-2">
                ❌ Rejected: {contribution.rejectionReason}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Top Contributors</h3>
        <div className="space-y-3">
          {statistics.playerStats.slice(0, 10).map((playerStat, index) => (
            <div key={playerStat.player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-500 text-white' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{playerStat.player.name}</p>
                  <p className="text-sm text-gray-600">
                    {playerStat.approvedContributions}/{playerStat.totalContributions} contributions approved
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{playerStat.itemsContributed}</p>
                <p className="text-xs text-gray-500">items contributed</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📈 Task Progress</h3>
        <div className="space-y-3">
          {statistics.taskStats.slice(0, 10).map((taskStat) => (
            <div key={taskStat.task.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium text-gray-800">{taskStat.task.itemName}</p>
                  <p className="text-sm text-gray-600">{getProjectName(taskStat.task.id)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{taskStat.progressPercentage}%</p>
                  <p className="text-xs text-gray-500">{taskStat.uniqueContributors} contributors</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(taskStat.progressPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {taskStat.itemsContributed}/{taskStat.task.targetQuantity} items completed
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
            <div className="text-sm text-gray-600">Total Contributions</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>
      </div>

      {/* Approval Rate */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Approval Metrics</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Approval Rate</span>
              <span>{statistics.total > 0 ? Math.round((statistics.approved / statistics.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${statistics.total > 0 ? (statistics.approved / statistics.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Contribution Dashboard</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-purple-100 mt-2">Manage and track all settlement contributions</p>
        </div>

        {/* Tabs */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex space-x-1">
            {[
              { key: 'pending', label: `Pending (${statistics.pending})`, color: 'yellow' },
              { key: 'approved', label: `Approved (${statistics.approved})`, color: 'green' },
              { key: 'rejected', label: `Rejected (${statistics.rejected})`, color: 'red' },
              { key: 'leaderboard', label: 'Leaderboard', color: 'purple' },
              { key: 'statistics', label: 'Statistics', color: 'blue' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? `bg-${tab.color}-100 text-${tab.color}-700 border border-${tab.color}-300`
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rejected') && (
            <div className="mt-4 flex space-x-4">
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Tasks</option>
                {v2Tasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title || task.name} ({task.targetQuantity}x)
                  </option>
                ))}
              </select>

              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Players</option>
                {settlementMembers.map(member => (
                  <option key={member.collaboration.userId} value={member.collaboration.userId}>
                    {member.user.displayName || member.user.email || 'Unknown Player'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(90vh-200px)]">
          {activeTab === 'leaderboard' && renderLeaderboard()}
          {activeTab === 'statistics' && renderStatistics()}
          {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rejected') && renderContributionsList()}
        </div>

        {/* Rejection Modal */}
        {selectedContribution && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Reject Contribution</h3>
              <p className="text-sm text-gray-600 mb-4">
                Why are you rejecting this contribution from {getPlayerName(selectedContribution.userId)}?
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => handleRejectContribution(selectedContribution.id, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setSelectedContribution(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 