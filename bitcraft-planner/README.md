# BitCraft Calculator

A web application for calculating crafting paths in the BitCraft game. This tool allows you to explore craftable items, view complete recursive ingredient trees, and understand what materials you need to craft any item.

## Features

- **Item Browser**: Search and filter through all craftable items
- **Recipe Trees**: View complete recursive ingredient breakdowns
- **Tier Filtering**: Filter items by tier level
- **Search**: Find items by name
- **Modern UI**: Clean, responsive design with dark theme

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Static JSON data (no backend required)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

3. **Open your browser** to http://localhost:3000

## Project Structure

```
src/
├── components/          # React components
│   ├── ItemList.tsx    # Item browser with search/filters
│   ├── ItemDetail.tsx  # Item information display
│   └── RecipeTree.tsx  # Recursive recipe tree component
├── state/
│   └── useItemsStore.ts # Zustand store for state management
├── types/
│   └── Item.ts         # TypeScript type definitions
├── utils/
│   ├── constants.ts    # App constants (rarity colors, etc.)
│   └── buildRecipeTree.ts # Recipe tree building logic
└── App.tsx             # Main application component
```

## Data

The application uses static JSON data extracted from BitCraft game files. The data includes:
- Item names, tiers, and rarity information
- Complete crafting recipes with ingredients
- Extraction/gathering skill requirements

## Usage

1. **Browse Items**: Use the left panel to search and filter items
2. **Select Item**: Click on any item to view its details
3. **View Recipe**: The right panel shows the complete ingredient tree
4. **Navigate Recursively**: The tree shows all sub-ingredients needed

## Development

This is a Phase 1 MVP focused on core calculation functionality. Future enhancements may include:
- Export ingredient shopping lists
- Favorites system
- Multiple recipe options
- Mobile app version

## License

Private project - not for public distribution.
