import React from "react";
import { useEffect, useState } from "react";
import axios from 'axios';

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [filtersBySection, setFiltersBySection] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/v1/salesforce/filters");
        if (!res.ok) throw new Error("Failed to fetch filters");
        const data = await res.json();
        setFiltersBySection(data);
      } catch (error) {
        console.error("Error fetching filters:", error);
        setFiltersBySection([]);
      }
    };

    fetchFilters();
  }, []);

  const handleFilterChange = (section, value) => {
    // Create normalized section keys
    const sectionKey = section === "Salesforce Expertise"
      ? "salesforceExpertise"
      : "industryExpertise";

    // Create a deep copy of the selectedFilters
    const updatedFilters = { ...selectedFilters };

    // Initialize the section array if it doesn't exist
    if (!updatedFilters[sectionKey]) {
      updatedFilters[sectionKey] = [];
    }

    // Add or remove the filter value
    if (updatedFilters[sectionKey].includes(value)) {
      updatedFilters[sectionKey] = updatedFilters[sectionKey].filter(item => item !== value);
      // Remove empty arrays to keep the object clean
      if (updatedFilters[sectionKey].length === 0) {
        delete updatedFilters[sectionKey];
      }
    } else {
      updatedFilters[sectionKey] = [...updatedFilters[sectionKey], value];
    }

    // Update selected filters and trigger the filter change
    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const renderSection = (section, filters) => {
    // Create normalized section keys
    const sectionKey = section === "Salesforce Expertise"
      ? "salesforceExpertise"
      : "industryExpertise";

    const filteredItems = filters.filter(item =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div key={section} className="mb-6">
        <h3 className="text-md font-semibold mb-2">{section}</h3>
        <div className="flex flex-col gap-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={item}
                  checked={selectedFilters[sectionKey]?.includes(item) || false}
                  onChange={() => handleFilterChange(section, item)}
                  className="checkbox checkbox-sm"
                />
                <span>{item}</span>
              </label>
            ))
          ) : (
            <span className="text-gray-500 text-sm">No matches</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-1/7 min-w-[250px] border-r border-gray-200 shadow-md p-4">
      <div className="sticky top-0 z-10 p-2">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search filters"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedFilters({});
              onFilterChange({});
              setSearchTerm("");
            }}
            className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
          >
            Reset
          </button>
        </div>
        <h2 className="text-lg font-semibold mb-4">Apply Filters</h2>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-180px)] pl-2">
        {filtersBySection.map(({ section, filters }) => renderSection(section, filters))}
      </div>
    </div>
  );
};

const SalesforceTable = ({ data, selectedFields = [], onFilterChange }) => {
  const [filteredData, setFilteredData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [displayFields, setDisplayFields] = useState(selectedFields);
  

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  // Update displayFields only when selectedFields changes from parent
  useEffect(() => {
    setDisplayFields(selectedFields);
  }, [selectedFields]);

  // Function to handle table search
  const handleTableSearch = (searchTerm) => {
    setTableSearchTerm(searchTerm);

    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = data.filter(item => {
      // Check all text fields in the item
      return Object.keys(item).some(key => {
        return item[key] && typeof item[key] === 'string' && item[key].toLowerCase().includes(term);
      });
    });

    setFilteredData(filtered);
  };

  // Determine which columns to show based on displayFields
  const getVisibleColumns = () => {
    // If no displayFields provided, show all fields
    if (!displayFields || displayFields.length === 0) {
      return {
        name: true,
        link: true,
        tagline: true,
        description: true,
        expertise: true,
        industries: true, 
        services: true,
        extendedDescription: true
      };
    }

    // Create object with selected fields
    const columns = {};
    displayFields.forEach(field => {
      if (field !== 'foundIn') { // Skip foundIn as it's not a display column
        columns[field] = true;
      }
    });
    return columns;
  };

  const visibleColumns = getVisibleColumns();

  return (
    <div className="flex h-screen overflow-hidden mt-6">
      <FilterSidebar
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onFilterChange={onFilterChange}
      />

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Table Search Bar and Export Button */}
        <div className="sticky top-0 z-20 bg-gray-100 px-6 pt-6 pb-4 border-gray-200 flex justify-between items-center">
          <input
            type="text"
            placeholder="Search in table"
            value={tableSearchTerm}
            onChange={(e) => handleTableSearch(e.target.value)}
            className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-600 ml-6">
              Showing {filteredData.length} of {data.length} entries
            </div>
            <table className="min-w-full border border-gray-200 shadow-md rounded-lg">
              <thead className="sticky top-[80px] z-10 bg-gray-100 font-semibold">
                <tr>
                  <th className="w-[2%] pb-2">#</th>
                  {visibleColumns.name && <th className="pb-2">Name</th>}
                  {visibleColumns.tagline && <th className="pb-2">Tagline</th>}
                  {visibleColumns.description && <th className="pb-2">Description</th>}
                  {visibleColumns.expertise && <th className="pb-2">Expertise</th>}
                  {visibleColumns.industries && <th className="pb-2">Industries</th>}
                  {visibleColumns.services && <th className="pb-2">Services</th>}
                  {visibleColumns.extendedDescription && <th className="pb-2">Extended Description</th>}
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr
                      key={index}
                      className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 pr-2 last:border-b-0 hover:bg-gray-50 transition"
                    >
                      <th className="py-2 pr-1">{index + 1}</th>
                      
                      {visibleColumns.name && (
                        <td className="py-2 pr-2">
                          {visibleColumns.link && item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {item.name}
                            </a>
                          ) : (
                            item.name
                          )}
                        </td>
                      )}
                      
                      {visibleColumns.tagline && (
                        <td className="py-2 pr-2">{item.tagline || "N/A"}</td>
                      )}
                      
                      {visibleColumns.description && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">{item.description || "N/A"}</div>
                        </td>
                      )}
                      
                      {visibleColumns.expertise && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">{item.expertise || "N/A"}</div>
                        </td>
                      )}
                      
                      {visibleColumns.industries && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">{item.industries || "N/A"}</div>
                        </td>
                      )}
                      
                      {visibleColumns.services && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">{item.services || "N/A"}</div>
                        </td>
                      )}
                      
                      {visibleColumns.extendedDescription && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">{item.extendedDescription || "N/A"}</div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th>#</th>
                  {visibleColumns.name && <th>Name</th>}
                  {visibleColumns.tagline && <th>Tagline</th>}
                  {visibleColumns.description && <th>Description</th>}
                  {visibleColumns.expertise && <th>Expertise</th>}
                  {visibleColumns.industries && <th>Industries</th>}
                  {visibleColumns.services && <th>Services</th>}
                  {visibleColumns.extendedDescription && <th>Extended Description</th>}
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesforceTable;