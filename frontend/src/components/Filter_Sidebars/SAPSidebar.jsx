import React, { useState, useMemo } from 'react';

const SAPSidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isIndustriesOpen, setIsIndustriesOpen] = useState(false);
  const [isEngagementOpen, setIsEngagementOpen] = useState(false);
  const [isCountriesOpen, setIsCountriesOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);

  // Unique filters
  const uniqueIndustries = useMemo(() => {
    const inds = new Set();
    data.forEach(d => d.industries?.forEach(i => i && inds.add(i.trim())));
    return [...inds].sort();
  }, [data]);

  const uniqueEngagement = useMemo(() => {
    const eng = new Set();
    data.forEach(d => d.engagement?.forEach(e => e && eng.add(e.trim())));
    return [...eng].sort();
  }, [data]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    data.forEach(d => d.countries?.forEach(c => c && countries.add(c.trim())));
    return [...countries].sort();
  }, [data]);

  // Collect all solution L2 items directly
  const uniqueSolutionsL2 = useMemo(() => {
    const set = new Set();
    data.forEach(p => {
      if (p.solutions) {
        Object.values(p.solutions).forEach(children => {
          children?.forEach(child => set.add(child.trim()));
        });
      }
    });
    return [...set].sort();
  }, [data]);
  
  const handleFilterToggle = (type, value) => {
    const updated = { ...selectedFilters };
    const key = 'sapFilters';
    if (!updated[key]) updated[key] = {};
    if (!updated[key][type]) updated[key][type] = [];

    if (updated[key][type].includes(value)) {
      updated[key][type] = updated[key][type].filter(v => v !== value);
    } else {
      updated[key][type].push(value);
    }

    setSelectedFilters(updated);
    onFilterChange(updated);
  };

  const renderFilterSection = (title, filters, type, isOpen, setIsOpen) => {
    const filtered = filters.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
    const hasResults = filtered.length > 0;

    return (
      <div className="mb-6">
        <button onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200">
          <span>{title}</span>
          <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {searchTerm && !isOpen && hasResults && setIsOpen(true)}

        {isOpen && (
          <div className="flex flex-col gap-2 mt-2 ml-2 max-h-64 overflow-y-auto">
            {hasResults ? filtered.map((filter, idx) => (
              <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox"
                       checked={selectedFilters.sapFilters?.[type]?.includes(filter) || false}
                       onChange={() => handleFilterToggle(type, filter)}
                       className="checkbox checkbox-sm" />
                <span>{filter}</span>
              </label>
            )) : (
              <div className="text-sm text-gray-500">No matches found.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSolutionsSection = () => {
    // Filter solutions based on search term
    const filtered = uniqueSolutionsL2.filter(s => 
      s.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const hasResults = filtered.length > 0;

    return (
      <div className="mb-6">
        <button onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200">
          <span>Solutions</span>
          <svg className={`w-4 h-4 transform transition-transform ${isSolutionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {searchTerm && !isSolutionsOpen && hasResults && setIsSolutionsOpen(true)}

        {isSolutionsOpen && (
          <div className="flex flex-col gap-2 mt-2 ml-2 max-h-64 overflow-y-auto">
            {hasResults ? filtered.map((solution, idx) => (
              <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedFilters.sapFilters?.solutions?.includes(solution) || false}
                  onChange={() => handleFilterToggle('solutions', solution)}
                  className="checkbox checkbox-sm" 
                />
                <span>{solution}</span>
              </label>
            )) : (
              <div className="text-sm text-gray-500">No solutions match your search.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-1/4 min-w-[300px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-100 pb-4">
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Search filters" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <div className="mb-4">
          <button 
            onClick={() => {
              setSelectedFilters({});
              onFilterChange({});
              setSearchTerm('');
              setIsIndustriesOpen(false);
              setIsEngagementOpen(false);
              setIsCountriesOpen(false);
              setIsSolutionsOpen(false);
            }}
            className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
          >
            Reset
          </button>
        </div>
        <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
        <div className="border-b border-gray-300 mb-4" />
      </div>

      <div className="flex-1 overflow-y-auto pl-2">
        {renderFilterSection('Industries', uniqueIndustries, 'industries', isIndustriesOpen, setIsIndustriesOpen)}
        {renderFilterSection('Engagement', uniqueEngagement, 'engagement', isEngagementOpen, setIsEngagementOpen)}
        {renderFilterSection('Countries', uniqueCountries, 'countries', isCountriesOpen, setIsCountriesOpen)}
        {renderSolutionsSection()}
      </div>
    </div>
  );
};

export default SAPSidebar;