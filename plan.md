# BitCraft Planner – Web MVP (Private)

## Overview

A private web application that mimics the functionality of BitPlanner for the BitCraft game. The app allows users to explore craftable items, view full recursive ingredient trees, and plan crafting paths. This is a Phase 1 MVP with no backend — static JSON only. The code will remain private and Cursor AI will be used for development.

## Goals

- Web-only MVP using static recipe data
- No backend (static JSON only)
- Fully private project (local or private Git)
- Later porting to iOS using Swift
- Use Cursor AI with memory enabled

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Zustand for state
- Static JSON data (BitPlanner recipes)
- Hosting: Local / Netlify / Vercel (private)
- Code Editor: Cursor AI

## File Structure

/public/data/recipes.json  
/src/components/ItemList.tsx  
/src/components/ItemDetail.tsx  
/src/components/RecipeTree.tsx  
/src/state/useItemsStore.ts  
/src/types/Item.ts  
/src/utils/buildRecipeTree.ts  
/src/App.tsx

## Data Models

Item:
- id: string
- name: string
- profession: string
- tier: number
- ingredients: array of { itemId: string, quantity: number }

## Cursor Memory Rules

- Use Zustand for global state only
- Recipe trees are recursive with no loops
- Missing item IDs should be shown in red
- Tailwind used for all styling
- Components should be stateless and functional
- Place constants in `utils/constants.ts`

## Components

ItemList:
- Lists all items
- Filters by name, profession, and tier
- Clicking sets selected item in state

ItemDetail:
- Shows selected item info
- Calls RecipeTree with item

RecipeTree:
- Recursively renders ingredients
- Shows quantity and name
- Missing items: red text

## To-Do List

1. Setup
   - [ ] Create private Git repo
   - [ ] Init React + TypeScript project
   - [ ] Install Tailwind CSS
   - [ ] Add folder structure

2. Data + State
   - [ ] Add recipes.json
   - [ ] Create Item and Ingredient types
   - [ ] Implement Zustand store

3. ItemList UI
   - [ ] List view
   - [ ] Search + filters
   - [ ] OnClick handler

4. ItemDetail + Tree
   - [ ] Display item info
   - [ ] Implement RecipeTree recursive view

5. Final Polish
   - [ ] Responsive styling
   - [ ] Error handling
   - [ ] Mobile test

## Deployment Notes

- Keep project private at all times
- Hosting optional via Netlify or Vercel
- No public APIs or accounts
- Prepare for iOS port after MVP complete

## Optional Features (Stretch Goals)

- Export ingredient list
- Add favorites
- Dark mode
- Tooltips or descriptions
