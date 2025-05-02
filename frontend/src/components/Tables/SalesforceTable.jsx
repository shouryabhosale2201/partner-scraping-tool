// SalesForceTable.jsx
import React from "react";
import { useEffect, useState } from "react";


const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [filtersBySection, setFiltersBySection] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/v1/salesforce/filters");
        if (!res.ok) throw new Error("Failed to fetch filters");
        const data = await res.json();
        // console.log("Fetched filters:", data);
        setFiltersBySection(data);
      } catch (error) {
        console.error("Error fetching filters:", error);
        setFiltersBySection([]);
      }
    };

    fetchFilters();
  }, []);

  const handleFilterChange = (section, value, parentCountry = null) => {
    // Create normalized section keys
    const sectionKey = section === "Salesforce Expertise"
      ? "salesforceExpertise"
      : section === "Industry Expertise"
        ? "industryExpertise"
        : section === "Country"
          ? "region" // This is for regions (Alabama, Arizona, etc.)
          : section.toLowerCase();

    // Special handling for country groups (UnitedStates, Canada, etc.)
    if (parentCountry) {
      // We're dealing with a region within a country
      const countryKey = "country";
      const updatedFilters = { ...selectedFilters };

      // Initialize arrays if they don't exist
      if (!updatedFilters[countryKey]) updatedFilters[countryKey] = [];
      if (!updatedFilters[sectionKey]) updatedFilters[sectionKey] = [];

      // Add or remove the region
      if (updatedFilters[sectionKey].includes(value)) {
        updatedFilters[sectionKey] = updatedFilters[sectionKey].filter(item => item !== value);
        if (updatedFilters[sectionKey].length === 0) delete updatedFilters[sectionKey];
      } else {
        updatedFilters[sectionKey] = [...updatedFilters[sectionKey], value];
      }

      // Make sure the parent country is included in country filters
      if (!updatedFilters[countryKey].includes(parentCountry)) {
        updatedFilters[countryKey] = [...updatedFilters[countryKey], parentCountry];
      }

      // If no regions are selected for this country, remove the country too
      const countryRegions = updatedFilters[sectionKey] || [];
      if (countryRegions.length === 0) {
        updatedFilters[countryKey] = updatedFilters[countryKey].filter(c => c !== parentCountry);
        if (updatedFilters[countryKey].length === 0) delete updatedFilters[countryKey];
      }

      setSelectedFilters(updatedFilters);
      onFilterChange(updatedFilters);
    } else {
      // Standard handling for non-nested filters
      const updatedFilters = { ...selectedFilters };

      if (!updatedFilters[sectionKey]) {
        updatedFilters[sectionKey] = [];
      }

      if (updatedFilters[sectionKey].includes(value)) {
        updatedFilters[sectionKey] = updatedFilters[sectionKey].filter(item => item !== value);
        if (updatedFilters[sectionKey].length === 0) {
          delete updatedFilters[sectionKey];
        }
      } else {
        updatedFilters[sectionKey] = [...updatedFilters[sectionKey], value];
      }

      setSelectedFilters(updatedFilters);
      onFilterChange(updatedFilters);
    }
  };

  const renderSection = (section, filters) => {
    const sectionKey = section === "Salesforce Expertise"
      ? "salesforceExpertise"
      : section === "Industry Expertise"
        ? "industryExpertise"
        : section === "Country"
          ? "region" // Changed to "region" for the checkbox values
          : section.toLowerCase();

    const isNested = section === "Country";

    // Flat filters: apply search filtering
    const filteredItems = !isNested
      ? filters.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      )
      : filters.map(country => ({
        ...country,
        children: country.children.filter(region =>
          region.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter(country => country.children.length > 0); // Only include if matching children

    return (
      <div key={section} className="mb-6">
        <h3 className="text-md font-semibold mb-2">{section}</h3>
        <div className="flex flex-col gap-2 pl-1">
          {isNested ? (
            filteredItems.map((country, i) => (
              <div key={i} className="pl-2">
                <h4 className="font-medium mb-1">{country.label}</h4>
                <div className="flex flex-col gap-1 pl-4">
                  {country.children.map((region, j) => (
                    <label key={j} className="flex items-start space-x-2 cursor-pointer break-words max-w-full">
                      <input
                        type="checkbox"
                        value={region}
                        checked={selectedFilters[sectionKey]?.includes(region) || false}
                        onChange={() => handleFilterChange(section, region, country.label)}
                        className="checkbox checkbox-sm"
                      />
                      <span className="text-sm break-words max-w-[200px]">{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Non-nested filters have a bug fix here - changed 'region' to 'item'
            filteredItems.length > 0 ? (
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
            )
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
            <table className="min-w-[1000px] w-full border border-gray-200 shadow-md rounded-lg">
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