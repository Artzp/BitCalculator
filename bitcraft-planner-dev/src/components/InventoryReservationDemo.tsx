import React from 'react';
import { useSettlementStore } from '../state/useSettlementStore';

export const InventoryReservationDemo: React.FC = () => {
  const { settlement } = useSettlementStore();

  if (!settlement) {
    return <div className="p-6 text-center text-gray-500">No settlement data available</div>;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4">🔒 Inventory Reservation System</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            <strong>Smart Allocation:</strong> When you create projects, materials are automatically reserved 
            to prevent double-counting between projects.
          </p>
          <p>
            <strong>Example:</strong> If you have 100 Iron Ore and create two projects that each need 80 Iron Ore, 
            only the first project will get the full allocation. The second project will only get 20 Iron Ore.
          </p>
          <p className="font-medium">
            🔒 Each piece of material can only be allocated to one project at a time!
          </p>
                 </div>
       </div>
     </div>
   );
 }; 