// SalesforceTable.jsx

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

const SalesforceTable = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableSearchTerm, setTableSearchTerm] = useState("");

  const handleFilterChange = async (filters) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Add Salesforce Expertise filters if present
      if (filters.salesforceExpertise?.length > 0) {
        params.append("salesforceExpertise", JSON.stringify(filters.salesforceExpertise));
      }

      // Add Industry Expertise filters if present
      if (filters.industryExpertise?.length > 0) {
        params.append("industryExpertise", JSON.stringify(filters.industryExpertise));
      }

      const endpoint = `http://localhost:5000/api/v1/salesforce/fetch${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setFilteredData(json.data);
        // Apply any existing table search term to the new data
        if (tableSearchTerm) {
          handleTableSearch(tableSearchTerm, json.data);
        }
      } else {
        setError(json.error || "Unknown error");
        setData([]);
        setFilteredData([]);
      }
    } catch (err) {
      setError(err.message);
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle table search
  const handleTableSearch = (searchTerm, dataToSearch = data) => {
    setTableSearchTerm(searchTerm);

    if (!searchTerm.trim()) {
      setFilteredData(dataToSearch);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = dataToSearch.filter(item => {
      // Check all text fields in the item
      return (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.tagline && item.tagline.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.expertise && item.expertise.toLowerCase().includes(term)) ||
        (item.industries && item.industries.toLowerCase().includes(term)) ||
        (item.services && item.services.toLowerCase().includes(term)) ||
        (item.extendedDescription && item.extendedDescription.toLowerCase().includes(term))
      );
    });

    setFilteredData(filtered);
  };

  // Fetch initial data when component mounts
  useEffect(() => {
    handleFilterChange({});  // No filters, fetch all.
  }, []);

  return (
    <div className="flex h-screen overflow-hidden mt-6">
      <FilterSidebar
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onFilterChange={handleFilterChange}
      />

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Table Search Bar */}
        <div className="sticky top-0 z-20 bg-gray-100 px-6 pt-6 pb-4 border-gray-200">
          <input
            type="text"
            placeholder="Search in table"
            value={tableSearchTerm}
            onChange={(e) => setTableSearchTerm(e.target.value)}
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
                  <th className="w-[2%]">#</th>
                  <th className="w-[12%] pb-2">Name</th>
                  <th className="w-[12%] pb-2">Tagline</th>
                  <th className="w-[25%] pb-2">Description</th>
                  <th className="w-[25%] pb-2">Highlights</th>
                  <th className="w-[30%] pb-2">Extended Description</th>
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
                      <td className="py-2 pr-2">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {item.name}
                        </a>
                      </td>
                      <td className="py-2 pr-2">{item.tagline}</td>
                      <td className="py-2 pr-2">
                        <div className="max-h-[100px] overflow-y-auto">{item.description}</div>
                      </td>
                      <td className="py-2 pr-2 whitespace-pre-line">
                        <div className="max-h-[100px] overflow-y-auto">
                          {item.expertise || "N/A"}
                          {"\n\n"}
                          {item.industries || "N/A"}
                          {"\n\n"}
                          {item.services || "N/A"}
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="max-h-[100px] overflow-y-auto">{item.extendedDescription}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Tagline</th>
                  <th>Description</th>
                  <th>Highlights</th>
                  <th>Extended Description</th>
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