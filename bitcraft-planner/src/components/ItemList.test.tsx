import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemList from './ItemList';
import { useItemsStore } from '../state/useItemsStore';

// Provide a simple items dataset via the store
const seedStore = () => {
  const { setItems, setIsLoading } = useItemsStore.getState();
  setItems({
    '1': { name: 'Stick', tier: 1, rarity: 0, icon: 'Items/Stick', recipes: [], extraction_skill: -1 },
    '2': { name: 'Flint', tier: 1, rarity: 0, icon: 'Items/Flint', recipes: [], extraction_skill: -1 },
    '3': { name: 'Rope', tier: 2, rarity: 1, icon: 'Items/Rope', extraction_skill: -1, recipes: [{
      level_requirements: 0,
      consumed_items: [{ id: 1, quantity: 3 }],
      output_quantity: 1,
      possibilities: {},
      building_requirement: null,
      skill_requirement: null,
    }] },
  });
  setIsLoading(false);
};

describe('ItemList filters and sorting', () => {
  beforeEach(() => {
    // Reset the store between tests
    const { setFilter, setSort } = useItemsStore.getState();
    setFilter({ searchTerm: '', tier: null, rarity: null, recipeType: 'all', profession: null });
    setSort({ by: 'tier', direction: 'asc' });
    seedStore();
  });

  it('filters by search term', () => {
    render(<ItemList />);
    fireEvent.change(screen.getByPlaceholderText(/search items/i), { target: { value: 'stick' } });
    expect(screen.getByText('Stick')).toBeInTheDocument();
    expect(screen.queryByText('Flint')).not.toBeInTheDocument();
    expect(screen.queryByText('Rope')).not.toBeInTheDocument();
  });

  it('filters by recipe type: craftable vs base', () => {
    render(<ItemList />);
    // Craftable only
    fireEvent.change(screen.getByDisplayValue('All Items'), { target: { value: 'craftable' } });
    expect(screen.getByText('Rope')).toBeInTheDocument();
    expect(screen.queryByText('Stick')).not.toBeInTheDocument();
    expect(screen.queryByText('Flint')).not.toBeInTheDocument();

    // Base only
    fireEvent.change(screen.getByDisplayValue('Craftable'), { target: { value: 'base' } });
    expect(screen.getByText('Stick')).toBeInTheDocument();
    expect(screen.getByText('Flint')).toBeInTheDocument();
    expect(screen.queryByText('Rope')).not.toBeInTheDocument();
  });

  it('filters by tier', () => {
    render(<ItemList />);
    fireEvent.change(screen.getByDisplayValue('All Tiers'), { target: { value: '2' } });
    expect(screen.getByText('Rope')).toBeInTheDocument();
    expect(screen.queryByText('Stick')).not.toBeInTheDocument();
  });

  it('sorts by name and toggles sort direction', () => {
    render(<ItemList />);
    // Switch to sort by name
    fireEvent.change(screen.getByDisplayValue('Sort: Tier'), { target: { value: 'name' } });
    const rows = screen.getAllByRole('heading', { level: 3 });
    // Alphabetical: Flint, Rope, Stick
    expect(rows[0]).toHaveTextContent('Flint');

    // Toggle sort direction to desc using the sort button
    fireEvent.click(screen.getByTitle(/sort descending/i));
    const rowsDesc = screen.getAllByRole('heading', { level: 3 });
    expect(rowsDesc[0]).toHaveTextContent('Stick');
  });
});
