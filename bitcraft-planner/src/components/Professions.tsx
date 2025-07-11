import React from 'react';

const professionsList = [
  "Forestry", "Mining", "Foraging", "Hunting", "Fishing", "Farming",
  "Carpentry", "Masonry", "Smithing", "Leatherworking", "Tailoring", "Scholar"
];

const skillsList = [
  "Cooking", "Exploration", "Taming", "Slayer/Monster-slaying",
  "Trading/Merchanting", "Construction", "Lore Keeping", "Sailing"
];

interface ProfessionsProps {
  selectedProfessions: string[];
  selectedSkills: string[];
  onProfessionChange: (profession: string) => void;
  onSkillChange: (skill: string) => void;
}

const Professions: React.FC<ProfessionsProps> = ({
  selectedProfessions,
  selectedSkills,
  onProfessionChange,
  onSkillChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Professions</h3>
        <p className="text-sm text-gray-500">Select the professions you specialize in.</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {professionsList.map((profession) => (
            <div key={profession} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id={profession}
                  name="professions"
                  type="checkbox"
                  checked={selectedProfessions.includes(profession)}
                  onChange={() => onProfessionChange(profession)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={profession} className="font-medium text-gray-700">{profession}</label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900">Skills</h3>
        <p className="text-sm text-gray-500">Select your general skills.</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {skillsList.map((skill) => (
            <div key={skill} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id={skill}
                  name="skills"
                  type="checkbox"
                  checked={selectedSkills.includes(skill)}
                  onChange={() => onSkillChange(skill)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={skill} className="font-medium text-gray-700">{skill}</label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { Professions }; 