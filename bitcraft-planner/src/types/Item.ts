export interface Ingredient {
  id: number;
  quantity: number;
}

export interface SkillRequirement {
  skill_name: string;
  skill_level: number;
  skill_id: number;
}

export interface Recipe {
  level_requirements: number;
  consumed_items: Ingredient[];
  output_quantity: number;
  possibilities: Record<number, number>;
  building_requirement: string | null;
  skill_requirement: SkillRequirement | null;
}

export interface Item {
  name: string;
  tier: number;
  rarity: number;
  icon: string;
  recipes: Recipe[];
  extraction_skill: number;
}

export interface ItemsData {
  [id: string]: Item;
} 