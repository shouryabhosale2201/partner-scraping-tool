// SalesForceTable.jsx
import React, { useEffect, useState, useMemo } from "react";

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [filtersBySection, setFiltersBySection] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState({}); // Track open/closed state of sections

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

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (section, value, parentCountry = null) => {
    const sectionKey = normalizeSectionKey(section);
    const updatedFilters = { ...selectedFilters };

    if (parentCountry) {
      const countryKey = "country";
      if (!updatedFilters[countryKey]) updatedFilters[countryKey] = [];
      if (!updatedFilters[sectionKey]) updatedFilters[sectionKey] = [];

      if (updatedFilters[sectionKey].includes(value)) {
        updatedFilters[sectionKey] = updatedFilters[sectionKey].filter(item => item !== value);
        if (updatedFilters[sectionKey].length === 0) delete updatedFilters[sectionKey];
      } else {
        updatedFilters[sectionKey] = [...updatedFilters[sectionKey], value];
      }

      if (!updatedFilters[countryKey].includes(parentCountry)) {
        updatedFilters[countryKey] = [...updatedFilters[countryKey], parentCountry];
      }

      const countryRegions = updatedFilters[sectionKey] || [];
      if (countryRegions.length === 0) {
        updatedFilters[countryKey] = updatedFilters[countryKey].filter(c => c !== parentCountry);
        if (updatedFilters[countryKey].length === 0) delete updatedFilters[countryKey];
      }
    } else {
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
    }

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const normalizeSectionKey = (section) => {
    if (section === "Salesforce Expertise") return "salesforceExpertise";
    if (section === "Industry Expertise") return "industryExpertise";
    if (section === "Country") return "region";
    return section.toLowerCase();
  };

  const renderSection = (section, filters) => {
    const sectionKey = normalizeSectionKey(section);
    const isNested = section === "Country";
    const isOpen = openSections[section] === true; // Get open state

    const filteredItems = !isNested
      ? filters.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      )
      : filters.map(country => ({
        ...country,
        children: country.children.filter(region =>
          region.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter(country => country.children.length > 0);

    return (
      <div key={section} className="mb-6">
        <button
          onClick={() => toggleSection(section)} // Use toggleSection
          className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-semibold rounded hover:bg-gray-300"
        >
          <span>{section}</span>
          <svg
            className={`w-4 h-4 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (  // Conditionally render content
          <div className="flex flex-col gap-2 pl-2 mt-2">
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
        )}
      </div>
    );
  };

  return (
    <div className="w-1/7 min-w-[280px] border-r border-gray-200 shadow-md p-4 h-screen flex flex-col sticky top-0 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gray-100 pb-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search filters"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedFilters({});
              onFilterChange({});
              setSearchTerm("");
              setOpenSections({}); // Reset open sections
            }}
            className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
          >
            Reset
          </button>
        </div>
        <h2 className="text-lg font-semibold mb-4">Apply Filters</h2>
      </div>

      <div className="flex-1 overflow-y-auto pl-2">
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  useEffect(() => {
    setFilteredData(data);
    setCurrentPage(1);
  }, [data]);

  useEffect(() => {
    setDisplayFields(selectedFields);
  }, [selectedFields]);

  const handleTableSearch = (searchTerm) => {
    setTableSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  // Handle change in page size
  const handlePageSizeChange = (e) => {
    setPartnersPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const getVisibleColumns = () => {
    // If no fields specified, show a default set
    if (!displayFields || displayFields.length === 0) {
      return {
        name: true,
        link: true
      };
    }

    const columns = {};
    displayFields.forEach(field => {
      // Skip internal fields used for filtering but not display
      if (field !== 'foundIn' && field !== 'countries' && field !== 'id') {
        columns[field] = true;
      }
    });

    // Always ensure name and link are available
    columns.name = true;
    columns.link = true;

    return columns;
  };

  const visibleColumns = getVisibleColumns();

  const searchedData = useMemo(() => {
    if (!tableSearchTerm.trim()) {
      return filteredData;
    }
    const term = tableSearchTerm.toLowerCase();
    return filteredData.filter(item => {
      return Object.keys(item).some(key => {
        return item[key] && typeof item[key] === 'string' && item[key].toLowerCase().includes(term);
      });
    });
  }, [filteredData, tableSearchTerm]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedData.length / itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const isPreviousDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages || searchedData.length <= itemsPerPage;


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

        {/* Table Search Bar */}
        <div className="sticky top-0 z-20 bg-gray-100 px-6 pt-4 pb-4 mb-4 border-gray-200">
          <div className="flex items-center justify-between">
            <input
              type="text"
              placeholder="Search in table"
              value={tableSearchTerm}
              onChange={(e) => handleTableSearch(e.target.value)}
              className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="flex items-center">
              <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">Show:</label>
              <select
                id="pageSize"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when page size changes
                }}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Showing {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, searchedData.length)} of {searchedData.length} partners
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
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
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 pr-2 last:border-b-0 hover:bg-gray-50 transition"
                    >
                      <th className="py-2 pr-1">{indexOfFirstItem + index + 1}</th>

                      {visibleColumns.name && (
                        <td className="py-2 pr-2">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {item.name || "N/A"}
                            </a>
                          ) : (
                            item.name || "N/A"
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
                          <div className="max-h-[100px] overflow-y-auto">
                            {item.foundIn ?
                              item.foundIn
                                .filter(entry => entry.section === "Salesforce Expertise")
                                .flatMap(entry => entry.filters)
                                .join(", ") || "N/A"
                              : "N/A"}
                          </div>
                        </td>
                      )}

                      {visibleColumns.industries && (
                        <td className="py-2 pr-2">
                          <div className="max-h-[100px] overflow-y-auto">
                            {item.foundIn ?
                              item.foundIn
                                .filter(entry => entry.section === "Industry Expertise")
                                .flatMap(entry => entry.filters)
                                .join(", ") || "N/A"
                              : "N/A"}
                          </div>
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
            </table>
            {/* Pagination Controls */}
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={handlePreviousPage}
                disabled={isPreviousDisabled}
                className={`px-4 py-2 rounded ${isPreviousDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
              >
                Previous
              </button>
              <div className="flex items-center text-gray-700">
                Page {currentPage} of {Math.max(1, totalPages)}
              </div>
              <button
                onClick={handleNextPage}
                disabled={isNextDisabled}
                className={`px-4 py-2 rounded ${isNextDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesforceTable;
