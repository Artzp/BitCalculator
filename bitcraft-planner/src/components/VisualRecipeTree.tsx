import React, { useState, useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { buildRecipeTree, RecipeTreeNode } from '../utils/buildRecipeTree';

interface VisualRecipeTreeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NodePosition {
  x: number;
  y: number;
  level: number;
  width: number;
  height: number;
}

interface TreeNode extends RecipeTreeNode {
  position: NodePosition;
  id: string;
  parentId?: string;
}

const VisualRecipeTree: React.FC<VisualRecipeTreeProps> = ({ isOpen, onClose }) => {
  const { buildList, items, inventory } = useItemsStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Advanced tree layout algorithm with proper positioning
  const calculateNodePositions = (tree: RecipeTreeNode): TreeNode[] => {
    const allNodes: TreeNode[] = [];
    const nodeWidth = 180;
    const nodeHeight = 120;
    const horizontalSpacing = 40;
    const verticalSpacing = 80;
    
    // First pass: assign levels and collect nodes
    const assignLevelsAndIds = (node: RecipeTreeNode, level: number = 0, parentId?: string): TreeNode => {
      const nodeId = `${node.itemId}-${level}-${Math.random().toString(36).substr(2, 9)}`;
      
      const treeNode: TreeNode = {
        ...node,
        id: nodeId,
        parentId,
        position: { x: 0, y: 0, level, width: nodeWidth, height: nodeHeight },
        children: []
      };
      
      // Recursively process children
      treeNode.children = node.children.map(child => 
        assignLevelsAndIds(child, level + 1, nodeId)
      );
      
      allNodes.push(treeNode);
      return treeNode;
    };
    
    const rootNode = assignLevelsAndIds(tree);
    
    // Second pass: calculate positions using a proper tree layout
    const calculateSubtreeWidth = (node: TreeNode): number => {
      if (node.children.length === 0) {
        return nodeWidth;
      }
      
      // Find the TreeNode children from allNodes array
      const treeNodeChildren = node.children.map(child => 
        allNodes.find(n => n.itemId === child.itemId && n.parentId === node.id)
      ).filter(Boolean) as TreeNode[];
      
      const childrenWidth = treeNodeChildren.reduce((sum, child) => 
        sum + calculateSubtreeWidth(child), 0
      );
      const spacingWidth = (treeNodeChildren.length - 1) * horizontalSpacing;
      
      return Math.max(nodeWidth, childrenWidth + spacingWidth);
    };
    
    const positionNodes = (node: TreeNode, x: number, y: number) => {
      node.position.x = x;
      node.position.y = y;
      
      if (node.children.length > 0) {
        const subtreeWidth = calculateSubtreeWidth(node);
        let currentX = x - subtreeWidth / 2;
        
        // Find the TreeNode children from allNodes array
        const treeNodeChildren = node.children.map(child => 
          allNodes.find(n => n.itemId === child.itemId && n.parentId === node.id)
        ).filter(Boolean) as TreeNode[];
        
        treeNodeChildren.forEach(child => {
          const childSubtreeWidth = calculateSubtreeWidth(child);
          const childX = currentX + childSubtreeWidth / 2;
          const childY = y + nodeHeight + verticalSpacing;
          
          positionNodes(child, childX, childY);
          currentX += childSubtreeWidth + horizontalSpacing;
        });
      }
    };
    
    // Start positioning from the root
    const totalWidth = calculateSubtreeWidth(rootNode);
    positionNodes(rootNode, totalWidth / 2, 60);
    
    return allNodes;
  };

  const visualTrees = useMemo(() => {
    return buildList.map(buildItem => {
      const tree = buildRecipeTree(buildItem.itemId, buildItem.quantity, items);
      const nodes = calculateNodePositions(tree);
      return {
        buildItem,
        tree,
        nodes,
        rootId: nodes[0]?.id
      };
    });
  }, [buildList, items]);

  const renderNode = (node: TreeNode, isRoot: boolean = false) => {
    const item = items[node.itemId];
    const inventoryQuantity = inventory[node.itemId] || 0;
    const hasEnough = inventoryQuantity >= node.quantity;
    const isSelected = selectedNode === node.id;
    const isRawMaterial = node.children.length === 0;
    
    // Get appropriate emoji/icon for the item type
    const getItemIcon = () => {
      if (isRoot) return '🎯';
      if (isRawMaterial) return '🌿';
      if (hasEnough) return '✅';
      return '⚙️';
    };
    
    const getNodeColors = () => {
      if (isRoot) return {
        bg: 'from-purple-600 to-purple-700',
        border: 'border-purple-400',
        glow: 'shadow-purple-500/25'
      };
      if (hasEnough) return {
        bg: 'from-emerald-600 to-emerald-700',
        border: 'border-emerald-400',
        glow: 'shadow-emerald-500/25'
      };
      if (isRawMaterial) return {
        bg: 'from-amber-600 to-amber-700',
        border: 'border-amber-400',
        glow: 'shadow-amber-500/25'
      };
      return {
        bg: 'from-blue-600 to-blue-700',
        border: 'border-blue-400',
        glow: 'shadow-blue-500/25'
      };
    };
    
    const colors = getNodeColors();
    
    return (
      <div
        key={node.id}
        className={`absolute cursor-pointer transition-all duration-300 ${
          isSelected ? 'z-20 scale-110' : 'z-10 hover:scale-105'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: 'translate(-50%, -50%)',
          width: node.position.width,
          height: node.position.height
        }}
        onClick={() => setSelectedNode(isSelected ? null : node.id)}
      >
        <div className={`relative h-full rounded-xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} 
          shadow-xl ${colors.glow} transition-all duration-300 backdrop-blur-sm
          ${isSelected ? 'ring-4 ring-white/50 shadow-2xl' : 'hover:shadow-2xl'}`}>
          
          {/* Glow effect for selected node */}
          {isSelected && (
            <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse"></div>
          )}
          
          {/* Header with icon and status */}
          <div className="flex items-center justify-between p-3 border-b border-white/20">
            <div className="text-2xl">{getItemIcon()}</div>
            <div className="text-xs text-white/80 font-medium">
              Tier {node.position.level}
            </div>
          </div>
          
          {/* Item name */}
          <div className="px-3 py-2">
            <h3 className="text-white font-bold text-sm leading-tight text-center min-h-[32px] flex items-center justify-center">
              {item?.name || 'Unknown Item'}
            </h3>
          </div>
          
          {/* Quantity display */}
          <div className="px-3 py-1">
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="text-white/70 text-xs">Need</div>
              <div className="text-white font-bold text-lg">
                {node.quantity.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Inventory status */}
          {inventoryQuantity > 0 && (
            <div className="px-3 py-1">
              <div className="bg-white/10 rounded-lg p-1 text-center">
                <div className="text-white/70 text-xs">Have: {inventoryQuantity}</div>
              </div>
            </div>
          )}
          
          {/* Building requirement */}
          {item?.recipes?.[0]?.building_requirement && (
            <div className="px-3 py-1">
              <div className="text-xs text-white/60 text-center truncate">
                🏗️ {item.recipes[0].building_requirement}
              </div>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="absolute -top-2 -right-2">
            {isRoot && (
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                T
              </div>
            )}
            {hasEnough && !isRoot && (
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                ✓
              </div>
            )}
            {isRawMaterial && !isRoot && !hasEnough && (
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                R
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConnections = (nodes: TreeNode[]) => {
    const connections: React.ReactElement[] = [];
    
    nodes.forEach(node => {
      node.children.forEach(child => {
        const childNode = nodes.find(n => 
          n.itemId === child.itemId && 
          n.parentId === node.id
        );
        
        if (childNode) {
          const startX = node.position.x;
          const startY = node.position.y + (node.position.height / 2);
          const endX = childNode.position.x;
          const endY = childNode.position.y - (childNode.position.height / 2);
          
          // Calculate control points for smooth curves
          const midY = startY + (endY - startY) / 2;
          const controlPoint1X = startX;
          const controlPoint1Y = midY;
          const controlPoint2X = endX;
          const controlPoint2Y = midY;
          
          // Create curved path
          const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`;
          
          connections.push(
            <g key={`${node.id}-${childNode.id}`}>
              {/* Glow effect */}
              <path
                d={pathData}
                stroke="rgba(148, 163, 184, 0.3)"
                strokeWidth="6"
                fill="none"
                className="blur-sm"
              />
              {/* Main line */}
              <path
                d={pathData}
                stroke="#94a3b8"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300 hover:stroke-white"
              />
              {/* Connection dots */}
              <circle
                cx={startX}
                cy={startY}
                r="4"
                fill="#94a3b8"
                className="transition-all duration-300"
              />
              <circle
                cx={endX}
                cy={endY}
                r="4"
                fill="#94a3b8"
                className="transition-all duration-300"
              />
            </g>
          );
        }
      });
    });
    
    return connections;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Visual Recipe Tree</h2>
            <p className="text-slate-400 text-sm mt-1">Interactive crafting dependency visualization</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {visualTrees.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="text-6xl mb-4">🔗</div>
              <p className="font-semibold text-xl mb-2">No items in build list</p>
              <p className="text-sm">Add items to see their crafting dependencies</p>
            </div>
          ) : (
            <div className="space-y-12">
              {visualTrees.map((tree, treeIndex) => {
                const maxX = Math.max(...tree.nodes.map(n => n.position.x));
                const maxY = Math.max(...tree.nodes.map(n => n.position.y));
                const containerWidth = Math.max(1200, maxX + 200);
                const containerHeight = Math.max(600, maxY + 150);
                
                return (
                  <div key={`tree-${tree.buildItem.itemId}-${treeIndex}`} className="relative">
                    <div className="mb-6 text-center">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {tree.buildItem.quantity}x {items[tree.buildItem.itemId]?.name}
                      </h3>
                      <div className="flex justify-center gap-6 text-sm text-slate-400">
                        <span>{tree.nodes.length} total components</span>
                        <span>{tree.nodes.filter(n => n.children.length === 0).length} raw materials needed</span>
                        <span>{tree.nodes.filter(n => n.children.length > 0).length} crafting steps</span>
                      </div>
                    </div>
                    
                    <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/50 p-8 overflow-auto">
                      <div 
                        className="relative mx-auto"
                        style={{
                          width: containerWidth,
                          height: containerHeight
                        }}
                      >
                        {/* SVG for connections */}
                        <svg 
                          className="absolute inset-0 pointer-events-none"
                          width={containerWidth}
                          height={containerHeight}
                        >
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="12"
                              markerHeight="8"
                              refX="11"
                              refY="4"
                              orient="auto"
                            >
                              <polygon
                                points="0 0, 12 4, 0 8"
                                fill="#64748b"
                              />
                            </marker>
                          </defs>
                          {renderConnections(tree.nodes)}
                        </svg>
                        
                        {/* Render nodes */}
                        {tree.nodes.map((node, index) => renderNode(node, index === 0))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer Legend */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-600 rounded border border-purple-400"></div>
                <span className="text-slate-300">Target Item</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-orange-600 rounded border border-orange-400"></div>
                <span className="text-slate-300">Raw Material</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-600 rounded border border-green-400"></div>
                <span className="text-slate-300">Have Enough</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-600 rounded border border-blue-400"></div>
                <span className="text-slate-300">Intermediate</span>
              </div>
            </div>
            <div className="text-slate-400 text-sm">
              Click nodes to highlight • Scroll to explore large trees
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualRecipeTree; 