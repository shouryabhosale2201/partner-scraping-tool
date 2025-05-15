// File: OracleSidebar.jsx
import React, { useState, useMemo, useEffect } from 'react';

const OracleSidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({});

  const hierarchy = useMemo(() => {
    const map = new Map();
    data.forEach(partner => {
      (partner.filters || []).forEach(({ level1Name, level2Name, level3Name, level4Name }) => {
        if (!level1Name || !level2Name || !level3Name || !level4Name) return;
        if (!map.has(level1Name)) map.set(level1Name, new Map());
        const level2 = map.get(level1Name);
        if (!level2.has(level2Name)) level2.set(level2Name, new Map());
        const level3 = level2.get(level2Name);
        if (!level3.has(level3Name)) level3.set(level3Name, new Set());
        level3.get(level3Name).add(level4Name);
      });
    });
    return map;
  }, [data]);

  const locations = useMemo(() => [...new Set(data.flatMap(p => p.locations || []))].sort(), [data]);

  const handleToggle = (filterName) => {
    const key = 'oracleFilters';
    const updated = { ...selectedFilters, [key]: selectedFilters[key]?.includes(filterName)
      ? selectedFilters[key].filter(f => f !== filterName)
      : [...(selectedFilters[key] || []), filterName] };
    setSelectedFilters(updated);
    onFilterChange(updated);
  };

  const toggleSection = name => setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));

  const matchesSearch = (text) => text.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div className="w-1/4 min-w-[300px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen sticky top-0 overflow-y-auto">
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search filters"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <button
          onClick={() => { setSelectedFilters({}); onFilterChange({}); setSearchTerm(''); setOpenSections({}); }}
          className="w-24 h-8 border border-gray-300 rounded-md bg-orange-500 text-white text-sm hover:bg-gray-600"
        >Reset</button>
      </div>
      <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
      <div className="border-b border-gray-300 mb-4"></div>

      <div className="mb-6">
        <button
          onClick={() => toggleSection('locations')}
          className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded"
        >
          <span>Countries (APAC)</span>
          <svg className={`w-4 h-4 transform ${openSections.locations ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.locations && (
          <div className="flex flex-col gap-2 mt-2 ml-2 max-h-64 overflow-y-auto">
            {locations
              .filter(loc => matchesSearch(loc))
              .map((loc, idx) => (
                <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={selectedFilters.oracleFilters?.includes(loc) || false} onChange={() => handleToggle(loc)} className="checkbox checkbox-sm" />
                  <span>{loc}</span>
                </label>
              ))}
          </div>
        )}
      </div>

      {Array.from(hierarchy.entries()).map(([level1Name, level2Map]) => {
        const showLevel1 = !searchTerm || Array.from(level2Map.values()).some(level3Map =>
          Array.from(level3Map.values()).some(set =>
            Array.from(set).some(level4 => matchesSearch(level4))
          )
        );
        if (!showLevel1) return null;

        return (
          <div key={level1Name} className="mb-4">
            <button
              onClick={() => toggleSection(level1Name)}
              className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded"
            >
              <span>{level1Name}</span>
              <svg className={`w-4 h-4 transform ${openSections[level1Name] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections[level1Name] && (
              <div className="ml-4">
                {Array.from(level2Map.entries()).map(([level2Name, level3Map]) => (
                  <div key={level2Name} className="mb-2">
                    <h4 className="text-sm ml-4 mb-1">{level2Name}</h4>
                    {Array.from(level3Map.entries()).map(([level3Name, level4Set]) => {
                      const level4Filtered = Array.from(level4Set).filter(level4 => matchesSearch(level4));
                      if (level4Filtered.length === 0) return null;
                      return (
                        <div key={level3Name} className="mb-2">
                          <h5 className="text-sm font-medium ml-8 mb-1">{level3Name}</h5>
                          <div className="ml-8 flex flex-col gap-2">
                            {level4Filtered.map((level4Name, idx) => (
                              <label key={idx} className="flex items-center space-x-2 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={selectedFilters.oracleFilters?.includes(level4Name) || false}
                                  onChange={() => handleToggle(level4Name)}
                                  className="checkbox checkbox-sm"
                                />
                                <span>{level4Name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OracleSidebar;
