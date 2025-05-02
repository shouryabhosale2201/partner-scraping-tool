import React, { useState, useEffect } from "react";

const SalesforceFieldSelector = ({ onFieldsChange, initialFields }) => {
  // Default required fields that cannot be unchecked
  const requiredFields = ["name", "link", "foundIn","countries"];
  
  // All available fields
  const allFields = [
    { id: "name", label: "Name", required: true },
    { id: "link", label: "Link", required: true },
    { id: "tagline", label: "Tagline", required: false },
    { id: "description", label: "Description", required: false },
    { id: "expertise", label: "Expertise", required: false },
    { id: "industries", label: "Industries", required: false },
    { id: "services", label: "Services", required: false },
    { id: "extendedDescription", label: "Extended Description", required: false },
    { id: "foundIn", label: "Filter Data", required: true },
    { id: "countries", label: "Location", required: true }

  ];
  
  // Initialize selected fields with required fields and any passed initial fields
  const [selectedFields, setSelectedFields] = useState(() => {
    if (initialFields && initialFields.length > 0) {
      return initialFields;
    }
    return allFields
      .filter(field => field.required)
      .map(field => field.id);
  });

  // When selectedFields change, notify parent component
  useEffect(() => {
    onFieldsChange(selectedFields);
  }, [selectedFields, onFieldsChange]);

  const handleCheckboxChange = (fieldId) => {
    if (requiredFields.includes(fieldId)) {
      return; // Don't allow unchecking required fields
    }
    
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(allFields.map(field => field.id));
  };

  const handleSelectNone = () => {
    setSelectedFields(requiredFields);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Select Fields to Scrape</h3>
      
      <div className="flex gap-2 mb-3">
        <button 
          onClick={handleSelectAll}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
        >
          Select All
        </button>
        <button 
          onClick={handleSelectNone}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
        >
          Select None
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allFields.map((field) => (
          <label key={field.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFields.includes(field.id)}
              onChange={() => handleCheckboxChange(field.id)}
              disabled={field.required}
              className="checkbox checkbox-sm"
            />
            <span className={field.required ? "font-medium" : ""}>
              {field.label} {field.required && <span className="text-orange-500">*</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        * Required fields cannot be unselected
      </div>
    </div>
  );
};

export default SalesforceFieldSelector;