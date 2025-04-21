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
        const data = await res.json(); // assuming it's an array of { section, filters }
        setFiltersBySection(data);
      } catch (error) {
        console.error("Error fetching filters:", error);
        setFiltersBySection([]);
      }
    };

    fetchFilters();
  }, []);

  const handleFilterChange = (value) => {
    const updated = selectedFilters.includes(value)
      ? selectedFilters.filter(item => item !== value)
      : [...selectedFilters, value];
    setSelectedFilters(updated);
    onFilterChange(updated);
  };

  const renderSection = (section, filters) => {
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
                  checked={selectedFilters.includes(item)}
                  onChange={() => handleFilterChange(item)}
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
    <div className="w-1/5 min-w-[250px] border-r border-gray-200 shadow-md p-4">
      {/* Sticky Apply Filters and Search */}
      <div className="sticky top-0 z-10 p-2">
        <h2 className="text-lg font-semibold mb-4">Apply Filters</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search filters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedFilters([]);
              onFilterChange([]);
              setSearchTerm("");
            }}
            className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-500 text-white text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Filters */}
      <div className="overflow-y-auto mt-2 max-h-[calc(100vh-180px)]">
        {filtersBySection.map(({ section, filters }) => renderSection(section, filters))}
      </div>
    </div>
  );
};

const SalesforceTable = () => {
  const [data, setData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);

  const handleFilterChange = async (filters) => {
    setSelectedFilters(filters);
    try {
      const params = new URLSearchParams();
      if (filters.length > 0) {
        params.append("filters", JSON.stringify(filters));
      }

      const res = await fetch(`http://localhost:5000/api/v1/salesforce/fetch?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden mt-6">
      <FilterSidebar
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onFilterChange={handleFilterChange}
      />
  
      <div className="flex-1 overflow-auto px-4">
        <table className="min-w-full border border-gray-200 shadow-md rounded-lg">
          <thead className="bg-base-200 text-base font-semibold sticky top-0 z-10">
            <tr>
              <th className="w-[4%]">#</th>
              <th className="w-[12%]">Name</th>
              <th className="w-[18%]">Tagline</th>
              <th className="w-[25%]">Description</th>
              <th className="w-[30%]">Highlights</th>
              <th className="w-[30%]">Extended Description</th>
              <th className="w-[10%]">Link</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr
                  key={index}
                  className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                >
                  <th className="py-2">{index + 1}</th>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">{item.tagline}</td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.description}</div>
                  </td>
                  <td className="py-2 whitespace-pre-line">
                    <div className="max-h-[100px] overflow-y-auto">
                      {item.expertise || "N/A"}
                      {"\n\n"}
                      {item.industries || "N/A"}
                      {"\n\n"}
                      {item.services || "N/A"}
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.extendedDescription}</div>
                  </td>
                  <td className="py-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visit
                    </a>
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
              <th>Link</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
  

};

export default SalesforceTable;
