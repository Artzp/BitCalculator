import { Item, Ingredient, ItemsData } from '../types/Item';

export interface RecipeTreeNode {
  itemId: string;
  item: Item | null;
  quantity: number;
  children: RecipeTreeNode[];
  isRoot?: boolean;
}

export function buildRecipeTree(
  itemId: string,
  quantity: number,
  items: ItemsData,
  visited: Set<string> = new Set()
): RecipeTreeNode {
  const item = items[itemId];
  
  // Base case: if item doesn't exist or we've seen it before (avoid loops)
  if (!item || visited.has(itemId)) {
    return {
      itemId,
      item: item || null,
      quantity,
      children: [],
    };
  }
  
  // If item has no recipes (base material), return leaf node
  if (!item.recipes || item.recipes.length === 0) {
    return {
      itemId,
      item,
      quantity,
      children: [],
    };
  }
  
  // Add this item to visited set to prevent loops
  const newVisited = new Set(visited);
  newVisited.add(itemId);
  
  // Use the first recipe (could be expanded to show multiple recipes)
  const recipe = item.recipes[0];
  
  // Build children recursively
  const children: RecipeTreeNode[] = recipe.consumed_items.map((ingredient: Ingredient) => {
    const childQuantity = Math.ceil((quantity / recipe.output_quantity) * ingredient.quantity);
    return buildRecipeTree(ingredient.id.toString(), childQuantity, items, newVisited);
  });
  
  return {
    itemId,
    item,
    quantity,
    children,
  };
} 