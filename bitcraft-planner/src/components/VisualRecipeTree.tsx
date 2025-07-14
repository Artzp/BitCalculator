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
}

interface TreeNode extends RecipeTreeNode {
  position: NodePosition;
  id: string;
}

const VisualRecipeTree: React.FC<VisualRecipeTreeProps> = ({ isOpen, onClose }) => {
  const { buildList, items, inventory } = useItemsStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Improved positioning algorithm for cleaner layout
  const calculateNodePositions = (tree: RecipeTreeNode): TreeNode[] => {
    const allNodes: TreeNode[] = [];
    const levelNodes: { [level: number]: RecipeTreeNode[] } = {};
    
    // First, collect all nodes by level
    const collectNodesByLevel = (node: RecipeTreeNode, level: number = 0) => {
      if (!levelNodes[level]) levelNodes[level] = [];
      levelNodes[level].push(node);
      
      node.children.forEach(child => {
        collectNodesByLevel(child, level + 1);
      });
    };
    
    collectNodesByLevel(tree);
    
    // Calculate positions with better spacing
    const nodeWidth = 220;
    const nodeHeight = 160;
    const levelHeight = 200;
    const startY = 80;
    
    Object.keys(levelNodes).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesAtLevel = levelNodes[level];
      const totalWidth = nodesAtLevel.length * nodeWidth;
      const startX = Math.max(300, (1200 - totalWidth) / 2); // Center nodes
      
      nodesAtLevel.forEach((node, index) => {
        const nodeId = `${node.itemId}-${level}-${index}`;
        const x = startX + (index * nodeWidth) + (nodeWidth / 2);
        const y = startY + (level * levelHeight);
        
        allNodes.push({
          ...node,
          id: nodeId,
          position: { x, y, level }
        });
      });
    });
    
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
    
    // Get the first letter of item name for the icon
    const iconLetter = item?.name?.charAt(0)?.toUpperCase() || '?';
    
    return (
      <div
        key={node.id}
        className={`absolute cursor-pointer transition-all duration-200 ${
          isSelected ? 'z-20 scale-105' : 'z-10'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={() => setSelectedNode(isSelected ? null : node.id)}
      >
        <div className={`relative rounded-lg border-2 p-4 w-[200px] shadow-lg transition-all duration-200 ${
          isRoot 
            ? 'bg-purple-600 border-purple-400' 
            : hasEnough 
            ? 'bg-green-600 border-green-400'
            : isRawMaterial 
            ? 'bg-orange-600 border-orange-400' 
            : 'bg-blue-600 border-blue-400'
        } ${isSelected ? 'ring-2 ring-white shadow-2xl' : 'hover:shadow-xl'}`}>
          
          {/* Large Letter Icon */}
          <div className="flex justify-center mb-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold text-white ${
              isRoot 
                ? 'bg-purple-700' 
                : hasEnough 
                ? 'bg-green-700'
                : isRawMaterial 
                ? 'bg-orange-700' 
                : 'bg-blue-700'
            }`}>
              {iconLetter}
            </div>
          </div>
          
          {/* Item Name */}
          <div className="text-white font-bold text-sm text-center mb-2 leading-tight min-h-[32px] flex items-center justify-center">
            {item?.name || 'Unknown Item'}
          </div>
          
          {/* Quantity */}
          <div className="text-center mb-3">
            <span className="text-white font-mono text-lg font-semibold">
              Qty: {node.quantity.toLocaleString()}
            </span>
          </div>
          
          {/* Status Badge */}
          <div className="flex justify-center mb-2">
            {isRoot && (
              <span className="px-3 py-1 bg-purple-800/60 text-purple-200 text-xs rounded-full font-medium border border-purple-400/50">
                Target
              </span>
            )}
            {isRawMaterial && !isRoot && (
              <span className="px-3 py-1 bg-orange-800/60 text-orange-200 text-xs rounded-full font-medium border border-orange-400/50">
                Raw Material
              </span>
            )}
            {hasEnough && !isRoot && (
              <span className="px-3 py-1 bg-green-800/60 text-green-200 text-xs rounded-full font-medium border border-green-400/50">
                Have: {inventoryQuantity}
              </span>
            )}
            {!isRawMaterial && !isRoot && !hasEnough && (
              <span className="px-3 py-1 bg-blue-800/60 text-blue-200 text-xs rounded-full font-medium border border-blue-400/50">
                Intermediate
              </span>
            )}
          </div>
          
          {/* Recipe Requirement */}
          {item?.recipes?.[0]?.building_requirement && (
            <div className="text-xs text-white/80 text-center leading-tight">
              Requires: {item.recipes[0].building_requirement}
            </div>
          )}
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
          n.position.level === node.position.level + 1
        );
        
        if (childNode) {
          const startX = node.position.x;
          const startY = node.position.y + 60; // Bottom of parent node
          const endX = childNode.position.x;
          const endY = childNode.position.y - 60; // Top of child node
          
          connections.push(
            <line
              key={`${node.id}-${childNode.id}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#64748b"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              className="drop-shadow-sm"
            />
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