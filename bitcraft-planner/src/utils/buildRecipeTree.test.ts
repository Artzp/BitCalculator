import { buildRecipeTree } from './buildRecipeTree';
import type { ItemsData } from '../types/Item';

describe('buildRecipeTree', () => {
  const items: ItemsData = {
    '1': { name: 'Stick', tier: 1, rarity: 0, icon: 'Items/Stick', recipes: [], extraction_skill: -1 },
    '2': { name: 'Flint', tier: 1, rarity: 0, icon: 'Items/Flint', recipes: [], extraction_skill: -1 },
    '10': {
      name: 'Stone Axe', tier: 1, rarity: 0, icon: 'Items/StoneAxe', extraction_skill: -1,
      recipes: [{
        level_requirements: 0,
        consumed_items: [ { id: 1, quantity: 2 }, { id: 2, quantity: 1 } ],
        output_quantity: 1,
        possibilities: {},
        building_requirement: 'Simple Smithing Station',
        skill_requirement: null,
      }]
    },
    '20': {
      name: 'Tool Kit', tier: 2, rarity: 0, icon: 'Items/ToolKit', extraction_skill: -1,
      recipes: [{
        level_requirements: 0,
        consumed_items: [ { id: 10, quantity: 2 } ],
        output_quantity: 1,
        possibilities: {},
        building_requirement: 'Simple Carpentry Station',
        skill_requirement: null,
      }]
    },
  };

  it('returns a leaf node for base resources', () => {
    const tree = buildRecipeTree('1', 3, items);
    expect(tree.itemId).toBe('1');
    expect(tree.quantity).toBe(3);
    expect(tree.children).toHaveLength(0);
  });

  it('expands consumed items with correct quantities', () => {
    const tree = buildRecipeTree('10', 1, items);
    expect(tree.children).toHaveLength(2);
    const [stickNode, flintNode] = tree.children;
    expect(stickNode.item?.name).toBe('Stick');
    expect(stickNode.quantity).toBe(2);
    expect(flintNode.item?.name).toBe('Flint');
    expect(flintNode.quantity).toBe(1);
  });

  it('scales sub-ingredient quantities when requesting multiples', () => {
    const tree = buildRecipeTree('20', 3, items);
    // Tool Kit needs 2 Stone Axes per 1 output, so for 3 kits we need 6 axes
    expect(tree.children).toHaveLength(1);
    const axeNode = tree.children[0];
    expect(axeNode.item?.name).toBe('Stone Axe');
    expect(axeNode.quantity).toBe(6);
    // And each axe requires 2 stick + 1 flint, so totals are 12 sticks and 6 flint
    const stickNode = axeNode.children.find(c => c.item?.name === 'Stick');
    const flintNode = axeNode.children.find(c => c.item?.name === 'Flint');
    expect(stickNode?.quantity).toBe(12);
    expect(flintNode?.quantity).toBe(6);
  });
});
