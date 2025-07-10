# 📘 Recipe Resolver with Inventory Pruning - User Guide

## 🌟 Overview

The **Recipe Resolver with Inventory Pruning** is a powerful new feature that intelligently analyzes your crafting dependencies while considering your current inventory. It provides detailed insights into what you need to craft, what you already have, and what you can skip.

## 🚀 How to Use

### 1. Add Items to Your Build List
- Browse the item catalog in the left panel
- Click **"Add to Build List"** on items you want to craft
- Set quantities and choose recipes as needed

### 2. Access the Recipe Resolver
- In the right panel, click the **📘 Resolver** tab
- Or click **"Analyze with Resolver"** on any build list item

### 3. View Your Analysis
The resolver provides two viewing modes:

#### 🌳 Tree View
- Shows the complete dependency tree
- Visual indentation shows crafting hierarchy  
- Each item displays status, needed quantity, and available quantity
- Nested ingredients show exactly what feeds into what

#### 📋 Flat Table View
- Summarized materials list sorted by tier
- Clear columns for needed/inventory/craft status
- Perfect for shopping lists and resource planning

## 🎯 Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Already Available | You have enough in inventory |
| 🔧 | Needs Crafting | Must be crafted to meet requirements |
| ❌ | Missing | No recipe available and not in inventory |
| ⏭️ | Skipped (nested) | Dependency resolved at higher level |

## 🧠 Key Features

### Inventory Pruning
- **Smart Analysis**: Only shows what you actually need to craft
- **Partial Coverage**: Handles cases where you have some but not all needed materials
- **Component Substitution**: Uses existing inventory logic for higher-tier item substitution

### Dependency Resolution
- **Recursive Processing**: Analyzes complete crafting chains
- **Circular Dependency Protection**: Prevents infinite loops
- **Recipe Selection**: Respects your chosen recipe variants

### Edge Case Handling
- **Base Items**: Properly identifies items with no recipes
- **Missing Data**: Gracefully handles items not found in database
- **Depth Limiting**: Prevents excessive recursion

## 💡 Example Output

```
🏠 Well × 1
├─ ✅ bucket_of_water × 1 (Have: 1, Need: 1) - Already Available
│  └─ ⏭️ bucket × 1 - Skipped (nested)
│     └─ ⏭️ wood × 3 - Skipped (nested)
```

**Flat Table Summary:**
| Item | Needed | Inventory | Craft | Status |
|------|--------|-----------|-------|---------|
| well | 1 | 0 | ✅ Yes | Needs Crafting |
| bucket_of_water | 1 | 1 | ❌ No | Already Available |

## 🔧 Technical Implementation

### Core Algorithm
1. **Target Analysis**: Check if target item is available in inventory
2. **Recipe Resolution**: Get the selected recipe and its ingredients  
3. **Recursive Processing**: Analyze each ingredient's dependencies
4. **Inventory Pruning**: Skip crafting paths when items are already available
5. **Result Assembly**: Build tree structure and flat summary

### Integration Points
- **State Management**: Uses existing Zustand store
- **Inventory Logic**: Leverages existing effective inventory calculations
- **Type Safety**: Full TypeScript implementation with proper interfaces
- **Component Architecture**: Modular design integrated with existing UI

## 🎮 User Experience

### Workflow Integration
1. **Plan Your Build**: Add items to build list as usual
2. **Analyze Dependencies**: Use resolver to understand requirements
3. **Manage Inventory**: Update inventory based on resolver insights
4. **Optimize Crafting**: Use tree view to plan efficient crafting order

### Visual Design
- **Intuitive Icons**: Clear visual indicators for each status
- **Color Coding**: Consistent color scheme across the application
- **Responsive Layout**: Works seamlessly on different screen sizes
- **Accessible Design**: Screen reader friendly with proper ARIA labels

## 🔮 Future Enhancements

### Planned Features
- **Cost Analysis**: Track time, XP, and resource costs
- **Profession Requirements**: Show which professions are needed
- **Multiple Outputs**: Support recipes that produce multiple items
- **Optimization Suggestions**: Recommend more efficient crafting paths

### Advanced Options
- **Gather-Only Items**: Mark certain items as "don't craft"
- **Buyable Items**: Integration with market pricing
- **Skill Limitations**: Consider current skill levels
- **Building Requirements**: Factor in available crafting stations

## 📊 Performance

- **Efficient Processing**: O(n) complexity for most operations
- **Memory Optimized**: Minimal memory footprint
- **Lazy Loading**: Only processes selected items
- **Cache Friendly**: Reuses existing item data structures

---

*This feature enhances your BitCraft planning experience by providing deep insights into crafting dependencies while respecting your current inventory state.* 