import { useState, useEffect } from "react";
export default function FieldSelectionComponent({ selectedFields, onFieldsChange }) {
  const availableFields = [
    { id: "name", label: "Partner Name", default: true, required: true },
    { id: "description", label: "Description", default: false },
    { id: "product", label: "Products", default: false },
    { id: "solutions", label: "Solutions", default: false },
    { id: "serviceType", label: "Service Types", default: false },
    { id: "industryFocus", label: "Industry Focus", default: true },
    { id: "country", label: "Country", default: true },
  ];
  // Initialize selection state
  useEffect(() => {
    if (!selectedFields || Object.keys(selectedFields).length === 0) {
      const initialSelection = {};
      availableFields.forEach((field) => {
        initialSelection[field.id] = field.default;
      });
      onFieldsChange(initialSelection);
    }
  }, []);
  const handleFieldChange = (fieldId) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.required && selectedFields[fieldId]) return;
    onFieldsChange({
      ...selectedFields,
      [fieldId]: !selectedFields[fieldId],
    });
  };
  const handleSelectAll = () => {
    const newSelection = {};
    availableFields.forEach(field => {
      newSelection[field.id] = true;
    });
    onFieldsChange(newSelection);
  };
  const handleSelectNone = () => {
    const newSelection = {};
    availableFields.forEach(field => {
      newSelection[field.id] = field.required || false;
    });
    onFieldsChange(newSelection);
  };
  return (
    <div className="mt-4 mb-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-medium mb-3">Select Fields to Scrape</h3>
      <div className="flex gap-2 mb-4">
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableFields.map((field) => (
          <div key={field.id} className="flex items-center">
            <input
              type="checkbox"
              id={`field-${field.id}`}
              checked={selectedFields[field.id] || false}
              onChange={() => handleFieldChange(field.id)}
              disabled={field.required}
              className="mr-2 h-4 w-4 text-orange-500 focus:ring-orange-400"
            />
            <label htmlFor={`field-${field.id}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        * Required fields cannot be deselected
      </p>
    </div>
  );
}