import { ItemsData, Item } from '../types/Item';
import { Project, ProjectItem, Task, SettlementInventory } from '../types/Settlement';
import { calculateMaterials } from './calculator';
import { buildRecipeTree, RecipeTreeNode } from './buildRecipeTree';

export interface SettlementProjectData {
  project: Omit<Project, 'id' | 'dateCreated'>;
  tasks: Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>[];
  totalMaterials: { itemId: string; itemName: string; quantity: number; isBaseItem: boolean; inInventory: number; stillNeeded: number }[];
}

/**
 * Create a new empty project
 */
export function createEmptyProject(
  name: string,
  description?: string
): Omit<Project, 'id' | 'dateCreated'> {
  return {
    name,
    description,
    items: [],
    assignedPlayers: [],
    priority: 'medium',
    status: 'not_started',
    progressPercentage: 0
  };
}

/**
 * Add an item to a project
 */
export function addItemToProject(
  project: Project,
  itemId: string,
  itemName: string,
  quantity: number,
  recipeIndex: number = 0
): ProjectItem {
  const newItem: ProjectItem = {
    itemId,
    itemName,
    targetQuantity: quantity,
    recipeIndex,
    completedQuantity: 0
  };
  
  return newItem;
}

/**
 * Generate tasks for all items in a project
 */
export function generateTasksForProject(
  items: ItemsData,
  project: Project,
  settlementInventory: SettlementInventory = {}
): { tasks: Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>[]; totalMaterials: { itemId: string; itemName: string; quantity: number; isBaseItem: boolean; inInventory: number; stillNeeded: number }[] } {
  const allTasks: Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>[] = [];
  const allMaterials = new Map<string, { itemId: string; itemName: string; quantity: number; isBaseItem: boolean; inInventory: number; stillNeeded: number }>();
  
  // Process each item in the project
  project.items.forEach(projectItem => {
    const itemData = createProjectFromItem(items, projectItem.itemId, projectItem.targetQuantity, projectItem.recipeIndex, settlementInventory);
    if (itemData) {
      allTasks.push(...itemData.tasks);
      
      // Merge materials (sum quantities for duplicates)
      itemData.totalMaterials.forEach(material => {
        if (allMaterials.has(material.itemId)) {
          const existing = allMaterials.get(material.itemId)!;
          existing.quantity += material.quantity;
          existing.stillNeeded += material.stillNeeded;
        } else {
          allMaterials.set(material.itemId, { ...material });
        }
      });
    }
  });
  
  // Consolidate duplicate tasks (same item, same type)
  const consolidatedTasks = new Map<string, Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>>();
  
  allTasks.forEach(task => {
    const key = `${task.itemId}_${task.type}`;
    if (consolidatedTasks.has(key)) {
      const existing = consolidatedTasks.get(key)!;
      existing.targetQuantity += task.targetQuantity;
    } else {
      consolidatedTasks.set(key, { ...task });
    }
  });
  
  return {
    tasks: Array.from(consolidatedTasks.values()),
    totalMaterials: Array.from(allMaterials.values())
  };
}

/**
 * Create a settlement project from a BitCraft item with automatic task generation
 * Takes into account existing settlement inventory
 */
export function createProjectFromItem(
  items: ItemsData,
  itemId: string,
  quantity: number,
  recipeIndex: number = 0,
  settlementInventory: SettlementInventory = {}
): SettlementProjectData | null {
  const item = items[itemId];
  if (!item) return null;

  // Calculate all required materials
  const calculation = calculateMaterials(items, itemId, quantity, recipeIndex);
  
  // Build the recipe tree to understand crafting dependencies
  const recipeTree = buildRecipeTree(itemId, quantity, items);
  
  // Generate tasks from the recipe tree, considering existing inventory
  const tasks: SettlementProjectData['tasks'] = [];
  const taskMap = new Map<string, Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>>();
  
  function processNode(node: RecipeTreeNode, depth: number = 0): void {
    const taskId = `${node.itemId}_${node.quantity}`;
    
    // Skip if we already processed this exact task
    if (taskMap.has(taskId)) return;
    
    const isBaseItem = !node.item?.recipes || node.item.recipes.length === 0;
    
    // Check how much we already have in inventory
    const inInventory = settlementInventory[node.itemId]?.quantity || 0;
    const availableQuantity = Math.max(0, inInventory - (settlementInventory[node.itemId]?.reservedQuantity || 0));
    const stillNeeded = Math.max(0, node.quantity - availableQuantity);
    
    // Only create task if we still need more items
    if (stillNeeded > 0) {
      const task = {
        type: (isBaseItem ? 'gather' : 'craft') as 'gather' | 'craft' | 'collect',
        itemId: node.itemId,
        itemName: node.item?.name || 'Unknown Item',
        targetQuantity: stillNeeded, // Only what we still need
        completedQuantity: 0,
        isBaseItem,
        recipeIndex: isBaseItem ? undefined : 0,
        buildingRequirement: !isBaseItem ? node.item?.recipes?.[0]?.building_requirement || undefined : undefined,
        dependencies: [] as string[],
        assignedTo: [] as string[],
        assignmentStatus: 'unassigned' as const
      };
      
      taskMap.set(taskId, task);
    }
    
    // Process children and add their task IDs as dependencies
    if (node.children.length > 0) {
      node.children.forEach(child => {
        processNode(child, depth + 1);
        const childTaskId = `${child.itemId}_${child.quantity}`;
        const task = taskMap.get(taskId);
        if (task && taskMap.has(childTaskId) && !task.dependencies!.includes(childTaskId)) {
          task.dependencies!.push(childTaskId);
        }
      });
    }
  }
  
  processNode(recipeTree);
  
  // Convert map to array, prioritizing base materials first
  const allTasks = Array.from(taskMap.values());
  
  // Sort tasks: gathering tasks first, then crafting tasks in dependency order
  allTasks.sort((a, b) => {
    if (a.isBaseItem && !b.isBaseItem) return -1;
    if (!a.isBaseItem && b.isBaseItem) return 1;
    return a.itemName.localeCompare(b.itemName);
  });
  
  // Create summary of total materials needed with inventory awareness
  const totalMaterials = calculation.totalMaterials.map(mat => {
    const inInventory = settlementInventory[mat.itemId]?.quantity || 0;
    const availableQuantity = Math.max(0, inInventory - (settlementInventory[mat.itemId]?.reservedQuantity || 0));
    return {
      itemId: mat.itemId,
      itemName: mat.itemName,
      quantity: mat.quantity,
      isBaseItem: mat.isBaseItem,
      inInventory: availableQuantity,
      stillNeeded: Math.max(0, mat.quantity - availableQuantity)
    };
  });

  return {
    project: {
      name: `${quantity}x ${item.name}`,
      description: `Auto-generated project for ${quantity}x ${item.name}`,
      items: [{
        itemId,
        itemName: item.name,
        targetQuantity: quantity,
        recipeIndex,
        completedQuantity: 0
      }],
      assignedPlayers: [],
      priority: 'medium',
      status: 'not_started',
      progressPercentage: 0
    },
    tasks: allTasks,
    totalMaterials
  };
}

/**
 * Get project progress based on completed tasks
 */
export function calculateProjectProgress(
  project: Project,
  tasks: Task[]
): number {
  const projectTasks = tasks.filter(task => task.projectId === project.id);
  
  if (projectTasks.length === 0) return 0;
  
  const totalItems = projectTasks.reduce((sum, task) => sum + task.targetQuantity, 0);
  const completedItems = projectTasks.reduce((sum, task) => sum + task.completedQuantity, 0);
  
  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

/**
 * Get all required materials for a project (reusing calculator logic)
 */
export function getProjectMaterials(
  items: ItemsData,
  project: Project,
  settlementInventory: SettlementInventory = {}
): { itemId: string; itemName: string; quantity: number; isBaseItem: boolean; inInventory: number; stillNeeded: number }[] {
  const result = generateTasksForProject(items, project, settlementInventory);
  return result.totalMaterials;
}

/**
 * Check if a project can be started (all dependencies available)
 */
export function canStartProject(
  items: ItemsData,
  project: Project,
  settlementInventory: SettlementInventory
): { canStart: boolean; missingMaterials: { itemId: string; itemName: string; needed: number; have: number }[] } {
  const materials = getProjectMaterials(items, project, settlementInventory);
  const missingMaterials: { itemId: string; itemName: string; needed: number; have: number }[] = [];
  
  materials.forEach(material => {
    if (material.stillNeeded > 0) {
      missingMaterials.push({
        itemId: material.itemId,
        itemName: material.itemName,
        needed: material.quantity,
        have: material.inInventory
      });
    }
  });
  
  return {
    canStart: missingMaterials.length === 0,
    missingMaterials
  };
}

/**
 * Get next available tasks (tasks whose dependencies are completed)
 */
export function getAvailableTasks(
  tasks: Task[]
): Task[] {
  return tasks.filter(task => {
    if (task.status === 'completed') return false;
    
    // Check if all dependencies are completed
    const dependencies = task.dependencies || [];
    return dependencies.every(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask?.status === 'completed';
    });
  });
}

/**
 * Update tasks when inventory changes - recalculate what's still needed
 */
export function updateTasksForInventoryChange(
  items: ItemsData,
  project: Project,
  tasks: Task[],
  settlementInventory: SettlementInventory
): { updatedTasks: Task[]; newTasks: Omit<Task, 'id' | 'dateCreated' | 'assignedPlayerId' | 'status' | 'priority' | 'projectId'>[] } {
  // Regenerate tasks for the project with new inventory
  const newData = generateTasksForProject(items, project, settlementInventory);
  
  // Update existing tasks or mark them as complete if inventory covers them
  const updatedTasks = tasks.map(task => {
    const newTask = newData.tasks.find(nt => nt.itemId === task.itemId && nt.type === task.type);
    if (newTask) {
      // Update target quantity if it changed
      return {
        ...task,
        targetQuantity: newTask.targetQuantity
      };
    } else {
      // Task is no longer needed (inventory covers it)
      return {
        ...task,
        completedQuantity: task.targetQuantity,
        status: 'completed' as const
      };
    }
  });
  
  // Find any completely new tasks that need to be created
  const existingTaskKeys = new Set(tasks.map(t => `${t.itemId}_${t.type}`));
  const newTasks = newData.tasks.filter(nt => !existingTaskKeys.has(`${nt.itemId}_${nt.type}`));
  
  return {
    updatedTasks,
    newTasks
  };
} 