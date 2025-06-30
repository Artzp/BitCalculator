# BitCraft Planner - Internal Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Component Structure](#component-structure)
4. [State Management](#state-management)
5. [Data Processing](#data-processing)
6. [Type System](#type-system)
7. [Styling System](#styling-system)
8. [Build Process](#build-process)

---

## Architecture Overview

The BitCraft Planner is a React-based single-page application (SPA) built with TypeScript. It follows a component-based architecture with centralized state management using Zustand.

### Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **State Management**: Zustand (lightweight Redux alternative)
- **Styling**: Tailwind CSS (via CDN)
- **Build Tool**: Create React App with react-scripts
- **Data Source**: Static JSON files (no backend)

### Key Design Principles
- **Static Data**: No server required - all data loaded from static JSON
- **Type Safety**: Full TypeScript coverage for data integrity
- **Component Isolation**: Functional components with minimal side effects
- **Responsive Design**: Mobile-first approach with Tailwind
- **Performance**: Efficient rendering with proper React patterns

---

## Data Flow

### 1. Application Initialization
```
App.tsx loads → useEffect triggers → fetch('/data/recipes.json') → setItems(data) → UI updates
```

### 2. User Interaction Flow
```
User Input → Component Event → Zustand Action → State Update → UI Re-render
```

### 3. Recipe Tree Generation
```
Item Selection → buildRecipeTree() → Recursive Processing → Tree Structure → RecipeTree Component
```

---

## Component Structure

### App.tsx (Root Component)
- **Purpose**: Main application container and data loader
- **Responsibilities**:
  - Load crafting data from static JSON
  - Render main layout (2-column grid)
  - Handle loading states
  - Provide global error boundary

**Key Code Flow:**
```typescript
useEffect(() => {
  async function loadItems() {
    setIsLoading(true);
    const response = await fetch('/data/recipes.json');
    const data: ItemsData = await response.json();
    setItems(data);
    setIsLoading(false);
  }
  loadItems();
}, []);
```

### ItemList.tsx (Item Browser)
- **Purpose**: Display filterable list of all craftable items
- **Responsibilities**:
  - Render search input and tier filter
  - Display filtered item list with pagination
  - Handle item selection
  - Show item metadata (tier, rarity, recipe count)

**Key Features:**
- **Search Filter**: Real-time text filtering by item name
- **Tier Filter**: Dropdown to filter by tier levels (-1 to max tier)
- **Rarity Display**: Color-coded rarity indicators
- **Recipe Count**: Shows number of available recipes per item

**Performance Optimizations:**
- Uses `getFilteredItems()` from store (computed property)
- Efficient re-rendering with proper key props
- Scrollable container with fixed height

### ItemDetail.tsx (Item Information Display)
- **Purpose**: Show detailed information about selected item
- **Responsibilities**:
  - Display item metadata (name, tier, rarity, extraction skill)
  - Render recipe information
  - Handle multiple recipes per item
  - Integrate with RecipeTree component

**Data Handling:**
- Gets selected item from Zustand store
- Handles null/undefined states gracefully
- Supports multiple recipes with tabbed interface

### RecipeTree.tsx (Recursive Recipe Visualization)
- **Purpose**: Display hierarchical ingredient breakdown
- **Responsibilities**:
  - Recursive tree rendering
  - Quantity calculations
  - Missing item detection (red text)
  - Visual indentation and structure

**Algorithm:**
```typescript
// Recursive tree traversal
if (!item || no recipes) return leaf node
for each ingredient:
  calculate required quantity
  recursively render ingredient tree
```

**Key Features:**
- **Loop Prevention**: Tracks visited items to prevent infinite recursion
- **Quantity Calculation**: Math.ceil((parentQty / outputQty) * ingredientQty)
- **Missing Item Handling**: Red text for items not found in data
- **Visual Hierarchy**: Indentation and borders for tree structure

---

## State Management

### Zustand Store (useItemsStore.ts)

The application uses a single Zustand store for all state management:

```typescript
interface ItemsStore {
  // Data
  items: ItemsData;              // All crafting data
  selectedItemId: string | null; // Currently selected item
  
  // Filters
  searchTerm: string;            // Search filter text
  tierFilter: number | null;     // Selected tier filter
  
  // UI State
  isLoading: boolean;            // Loading indicator
  
  // Actions
  setItems: (items: ItemsData) => void;
  setSelectedItemId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setTierFilter: (tier: number | null) => void;
  setIsLoading: (loading: boolean) => void;
  
  // Computed Properties
  getSelectedItem: () => Item | null;
  getFilteredItems: () => [string, Item][];
}
```

### State Flow Patterns

**1. Data Loading:**
```
App.tsx → setIsLoading(true) → fetch data → setItems(data) → setIsLoading(false)
```

**2. Item Selection:**
```
ItemList → handleItemClick → setSelectedItemId → ItemDetail re-renders
```

**3. Filtering:**
```
User types → setSearchTerm → getFilteredItems recalculates → ItemList re-renders
```

### Why Zustand Over Redux
- **Smaller Bundle**: No additional dependencies
- **Simpler API**: Direct mutations without reducers
- **TypeScript Native**: Better type inference
- **Less Boilerplate**: Actions are just functions

---

## Data Processing

### Input Data Structure (crafting_data.json)
```json
{
  "itemId": {
    "name": "Item Name",
    "tier": 1,
    "rarity": 2,
    "icon": "path/to/icon",
    "recipes": [
      {
        "level_requirements": 5,
        "consumed_items": [
          {"id": 123, "quantity": 2}
        ],
        "output_quantity": 1,
        "possibilities": {}
      }
    ],
    "extraction_skill": 10
  }
}
```

### Data Processing Pipeline

**1. JSON Loading:**
- Static file served from `public/data/recipes.json`
- 2.7MB of BitCraft game data
- Parsed into TypeScript interfaces

**2. Recipe Tree Building:**
```typescript
function buildRecipeTree(itemId, quantity, items, visited = new Set()) {
  // Prevent infinite loops
  if (visited.has(itemId)) return leaf;
  
  // Add to visited set
  visited.add(itemId);
  
  // Process ingredients recursively
  children = recipe.consumed_items.map(ingredient => 
    buildRecipeTree(ingredient.id, calculatedQuantity, items, visited)
  );
  
  return { itemId, item, quantity, children };
}
```

**3. Filtering Algorithm:**
```typescript
getFilteredItems: () => {
  return Object.entries(items).filter(([id, item]) => {
    // Text search
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Tier filter
    if (tierFilter !== null && item.tier !== tierFilter) {
      return false;
    }
    
    return true;
  });
}
```

### Performance Considerations
- **Memoization**: Zustand computed properties prevent unnecessary recalculations
- **Lazy Loading**: Recipe trees only built when item selected
- **Efficient Filtering**: Early returns in filter functions
- **Memory Management**: Proper cleanup of visited sets

---

## Type System

### Core Type Definitions (types/Item.ts)

```typescript
export interface Ingredient {
  id: number;        // Item ID reference
  quantity: number;  // Required amount
}

export interface Recipe {
  level_requirements: number;      // Skill level needed
  consumed_items: Ingredient[];    // Input materials
  output_quantity: number;         // Items produced
  possibilities: Record<number, number>; // RNG outcomes
}

export interface Item {
  name: string;           // Display name
  tier: number;           // Tier level (-1 for base items)
  rarity: number;         // 1-5 rarity scale
  icon: string;           // Icon asset path
  recipes: Recipe[];      // Crafting recipes
  extraction_skill: number; // Gathering skill required
}

export interface ItemsData {
  [id: string]: Item;     // Key-value store of all items
}
```

### Type Safety Benefits
- **Compile-time Checks**: TypeScript catches data structure errors
- **IDE Support**: Auto-completion and refactoring
- **Runtime Safety**: Type guards for API responses
- **Documentation**: Types serve as living documentation

---

## Styling System

### Tailwind CSS Implementation
- **CDN Delivery**: `<script src="https://cdn.tailwindcss.com"></script>`
- **No Build Step**: Eliminates PostCSS configuration issues
- **Utility Classes**: Atomic CSS approach for rapid development

### Design System Constants (utils/constants.ts)
```typescript
export const RARITY_COLORS = {
  1: 'text-gray-400',    // Common
  2: 'text-green-400',   // Uncommon
  3: 'text-blue-400',    // Rare
  4: 'text-purple-400',  // Epic
  5: 'text-yellow-400',  // Legendary
} as const;
```

### UI Patterns
- **Dark Theme**: `bg-gray-900` base with lighter grays for containers
- **Color Coding**: Consistent rarity colors across components
- **Responsive Grid**: `grid-cols-1 lg:grid-cols-2` for mobile-first design
- **Interactive States**: Hover effects with `hover:bg-gray-600` transitions

---

## Build Process

### Development Build
```bash
npm start
# → react-scripts start
# → Webpack dev server on http://localhost:3000
# → Hot reloading enabled
# → TypeScript compilation
# → ESLint checking
```

### Production Build
```bash
npm run build
# → react-scripts build
# → TypeScript compilation
# → Code optimization and minification
# → Static assets generation
# → Build folder ready for deployment
```

### Build Optimizations
- **Code Splitting**: Automatic chunking for faster loading
- **Tree Shaking**: Removes unused code
- **Asset Optimization**: Image and CSS minification
- **Cache Busting**: Filename hashing for browser caching

### Deployment Options
- **Static Hosting**: Can be served from any web server
- **CDN Deployment**: Netlify, Vercel, GitHub Pages compatible
- **Local Serving**: `serve -s build` for local production testing

---

## Error Handling

### Runtime Error Patterns
1. **Missing Items**: Red text display in RecipeTree
2. **Invalid Recipes**: Graceful fallback to "Invalid recipe index"
3. **Network Errors**: Loading state with error messages
4. **Type Mismatches**: TypeScript prevents most runtime type errors

### Development Tools
- **TypeScript Compiler**: Catches type errors at build time
- **ESLint**: Code quality and pattern enforcement
- **React DevTools**: Component inspection and debugging
- **Browser DevTools**: Network and performance debugging

---

## Future Improvements

### Performance Optimizations
- **Virtualization**: For large item lists (react-window)
- **Memoization**: React.memo for expensive components
- **Service Worker**: Offline caching of data
- **Lazy Loading**: Code splitting by route/feature

### Feature Enhancements
- **Recipe Variants**: Multiple recipe paths with cost comparison
- **Shopping Lists**: Export ingredient lists for gathering
- **Favorites**: Save frequently used items
- **Search Improvements**: Fuzzy search and ingredient search

### Technical Debt
- **Testing**: Unit tests for components and utilities
- **Documentation**: JSDoc comments for all functions
- **Accessibility**: ARIA labels and keyboard navigation
- **Internationalization**: Multi-language support

---

This documentation provides a comprehensive understanding of how the BitCraft Planner operates internally, from data loading to user interaction to rendering optimization. 