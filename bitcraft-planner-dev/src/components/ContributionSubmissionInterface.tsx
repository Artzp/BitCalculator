import React, { useState, useEffect } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { useAuth } from '../hooks/useAuth';

interface ContributionSubmissionInterfaceProps {
  onClose: () => void;
}

export const ContributionSubmissionInterface: React.FC<ContributionSubmissionInterfaceProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { items } = useItemsStore();
  
  // V2 state
  const [v2Tasks, setV2Tasks] = useState<any[]>([]);
  const [v2Projects, setV2Projects] = useState<any[]>([]);
  const [currentSettlement, setCurrentSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [itemsCompleted, setItemsCompleted] = useState<{
    itemId: string;
    itemName: string;
    quantity: number;
  }[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [proofOfWork, setProofOfWork] = useState<string>('');

  // Load V2 data (tasks, projects, and settlement)
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
          const settlement = userSettlements[0]; // Use first settlement
          setCurrentSettlement(settlement);
          
          // Load projects for current settlement
          const projects = await settlementService.getProjectsBySettlement(settlement.id);
          setV2Projects(projects);
          
          // Load tasks for all projects
          const allTasks: any[] = [];
          for (const project of projects) {
            const projectTasks = await settlementService.getTasksByProject(project.id);
            allTasks.push(...projectTasks);
          }
          setV2Tasks(allTasks);
          
          console.log(`Loaded ${allTasks.length} V2 tasks for contribution submission interface`);
        }
      } catch (error) {
        console.error('Error loading V2 data for contribution submission:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadV2Data();
  }, [user]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="text-center text-gray-500">Loading assigned tasks...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="text-center text-gray-500">Please log in to submit contributions</div>
        </div>
      </div>
    );
  }

  // Get tasks assigned to current user (using V2 tasks)
  const myTasks = v2Tasks.filter(task => 
    task.assignedTo === user.uid && 
    (task.status === 'pending' || task.status === 'in_progress')
  );

  console.log('Debug: User tasks filtering:', {
    userId: user.uid,
    allTasks: v2Tasks.length,
    myTasks: myTasks.length,
    tasksWithAssignments: v2Tasks.filter(t => t.assignedTo).length,
    sampleTask: v2Tasks[0]
  });

  const getProjectName = (projectId: string) => {
    const project = v2Projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    
    // Extract item info from task - tasks should specify exactly what item they're for
    const taskItemId = task.metadata?.itemId || task.itemId;
    let taskItemName = task.metadata?.itemName || task.itemName;
    
    // If no explicit item name, try to extract from task title (e.g., "Craft 1x Sturdy Tree Bark")
    if (!taskItemName && task.title) {
      const match = task.title.match(/(?:Craft|Make|Build|Produce)\s+\d+x?\s+(.+)/i);
      if (match) {
        taskItemName = match[1].trim();
      } else {
        taskItemName = task.title;
      }
    }
    
    // Find the actual item ID if we only have the name
    let finalItemId = taskItemId;
    let finalItemName = taskItemName || 'Unknown Item';
    
    if (!taskItemId && taskItemName) {
      // Search for item by name in the items database
      const foundItem = Object.entries(items).find(([_, itemData]) => 
        itemData.name.toLowerCase() === taskItemName.toLowerCase()
      );
      if (foundItem) {
        finalItemId = foundItem[0];
        finalItemName = foundItem[1].name;
      }
    }
    
    // Initialize with the task's specific item - user shouldn't need to choose
    setItemsCompleted([{
      itemId: finalItemId,
      itemName: finalItemName,
      quantity: 0
    }]);
    setNotes('');
    setProofOfWork('');
    
    console.log('Task item auto-selected:', {
      taskTitle: task.title,
      extractedItemId: finalItemId,
      extractedItemName: finalItemName,
      taskMetadata: task.metadata
    });
  };

  const handleAddContributionItem = () => {
    setItemsCompleted([...itemsCompleted, {
      itemId: '',
      itemName: '',
      quantity: 0
    }]);
  };

  const handleRemoveContributionItem = (index: number) => {
    setItemsCompleted(itemsCompleted.filter((_, i) => i !== index));
  };

  const handleContributionItemChange = (index: number, field: string, value: any) => {
    const updated = itemsCompleted.map((item, i) => {
      if (i === index) {
        if (field === 'itemId') {
          // When item changes, update both ID and name
          const selectedItem = items[value];
          return {
            ...item,
            itemId: value,
            itemName: selectedItem?.name || value
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setItemsCompleted(updated);
  };

  const handleSubmitContribution = async () => {
    if (!selectedTask || !user || !currentSettlement) return;

    // Validate items
    const validItems = itemsCompleted.filter(item => 
      item.itemId && item.itemName && item.quantity > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one item with a quantity greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      // Create contribution record - don't include undefined fields
      const contribution: any = {
        userId: user.uid,
        taskId: selectedTask.id,
        settlementId: currentSettlement.id,
        itemsContributed: validItems,
        submissionDate: new Date(),
        status: 'pending' as const, // Always pending for admin approval
        submittedBy: {
          displayName: user.displayName || user.email || 'Unknown User',
          email: user.email || 'no-email@example.com'
        }
      };

      // Only include notes and proofOfWork if they have content (Firestore doesn't allow undefined)
      const trimmedNotes = notes.trim();
      const trimmedProofOfWork = proofOfWork.trim();
      
      if (trimmedNotes) {
        contribution.notes = trimmedNotes;
      }
      
      if (trimmedProofOfWork) {
        contribution.proofOfWork = trimmedProofOfWork;
      }

      // Save to Firestore (you'll need to add this method to SettlementV2Service)
      await settlementService.createTaskContribution(contribution);

      // Reset form
      setSelectedTask(null);
      setItemsCompleted([]);
      setNotes('');
      setProofOfWork('');
      
      alert('Contribution submitted successfully! Your work is pending admin approval.');
      
    } catch (error) {
      console.error('Error submitting contribution:', error);
      console.error('Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        taskId: selectedTask.id,
        settlementId: currentSettlement.id,
        userId: user.uid,
        itemsCount: validItems.length
      });
      alert(`Error submitting contribution: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-blue-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Submit Contributions</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-green-100 mt-2">Submit your work progress for assigned tasks</p>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* My Tasks */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">My Assigned Tasks ({myTasks.length})</h3>
            
            <div className="space-y-4">
              {myTasks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p>No tasks assigned to you yet</p>
                  <p className="text-sm mt-2">Check with your settlement admins for task assignments</p>
                </div>
              ) : (
                myTasks.map(task => {
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTask?.id === task.id
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {task.title || `${task.targetQuantity}x ${task.metadata?.itemName || 'Item'}`}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">Project: {getProjectName(task.projectId)}</p>
                      
                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Contribution Form */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {selectedTask ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Submit Work Completed</h3>
                
                {/* Task Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800">{selectedTask.title}</h4>
                  <p className="text-sm text-blue-600">Project: {getProjectName(selectedTask.projectId)}</p>
                  {selectedTask.description && (
                    <p className="text-sm text-blue-700 mt-2">{selectedTask.description}</p>
                  )}
                </div>

                {/* Items Completed */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Items Completed</h4>
                    <button
                      onClick={handleAddContributionItem}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      title="Add additional items you completed while working on this task"
                    >
                      + Add Extra Item
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {itemsCompleted.map((item, index) => (
                      <div key={index} className="flex space-x-3 items-center p-3 bg-gray-50 rounded-lg">
                        {index === 0 ? (
                          // First item is locked to the task item - show as read-only with task icon
                          <div className="flex-1 px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-md flex items-center">
                            <span className="text-blue-600 mr-2">🎯</span>
                            <span className="font-medium text-blue-800">{item.itemName}</span>
                            <span className="text-xs text-blue-600 ml-2">(Task Item)</span>
                          </div>
                        ) : (
                          // Additional items can be selected from dropdown
                          <select
                            value={item.itemId}
                            onChange={(e) => handleContributionItemChange(index, 'itemId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select Additional Item</option>
                            {Object.entries(items).slice(0, 100).map(([itemId, itemData]) => (
                              <option key={itemId} value={itemId}>
                                {itemData.name}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleContributionItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Qty"
                        />
                        
                        {index === 0 ? (
                          // Can't remove the main task item
                          <div className="w-10 h-10 flex items-center justify-center text-gray-400">
                            🔒
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRemoveContributionItem(index)}
                            className="text-red-600 hover:text-red-700 px-2 py-2"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes and Proof */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information about your work..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Proof of Work (Optional)</label>
                    <textarea
                      value={proofOfWork}
                      onChange={(e) => setProofOfWork(e.target.value)}
                      placeholder="Screenshots, descriptions, or evidence of your work..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleSubmitContribution}
                    disabled={submitting || itemsCompleted.filter(i => i.quantity > 0).length === 0}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setItemsCompleted([]);
                      setNotes('');
                      setProofOfWork('');
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-xs text-orange-600 mt-3 text-center">
                  ⚠️ Contributions require admin approval before being counted toward progress
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">👈</div>
                <p>Select a task from the left to submit contributions</p>
                <p className="text-sm mt-2">Choose from your assigned tasks to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 