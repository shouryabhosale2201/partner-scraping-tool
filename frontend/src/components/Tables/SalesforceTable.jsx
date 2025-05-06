// SalesForceTable.jsx
import React, { useEffect, useState, useMemo } from "react";

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
  const [filtersBySection, setFiltersBySection] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch("/resources/salesforce.json");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        const sectionsMap = {};
        data.forEach((partner) => {
          if (partner.foundIn) {
            partner.foundIn.forEach(({ section, filters }) => {
              if (!sectionsMap[section]) sectionsMap[section] = new Set();
              filters.forEach((filter) => {
                if (filter) sectionsMap[section].add(filter);
              });
            });
          }
        });

        const organizeCountryRegions = () => {
          const countryMap = {};
          data.forEach(item => {
            const countries = item.countries || {};
            for (const [country, regions] of Object.entries(countries)) {
              if (!countryMap[country]) countryMap[country] = new Set();
              regions.forEach(r => {
                if (r) countryMap[country].add(r);
              });
            }
          });
          return Object.entries(countryMap).map(([label, regions]) => ({
            label,
            children: Array.from(regions).sort()
          })).sort((a, b) => a.label.localeCompare(b.label));
        };

        const filtersData = [
          { section: "Country", filters: organizeCountryRegions() },
          ...Object.entries(sectionsMap).map(([section, filtersSet]) => ({
            section,
            filters: [...filtersSet].sort()
          }))
        ];

        setFiltersBySection(filtersData);
      } catch (err) {
        console.error("Error building filters:", err);
        setFiltersBySection([]);
      }
    };
    fetchFilters();
  }, []);

  const normalizeSectionKey = (section) => {
    if (section === "Salesforce Expertise") return "salesforceExpertise";
    if (section === "Industry Expertise") return "industryExpertise";
    if (section === "Country") return "region";
    return section.toLowerCase();
  };

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
    } else {
      if (!updatedFilters[sectionKey]) updatedFilters[sectionKey] = [];
      if (updatedFilters[sectionKey].includes(value)) {
        updatedFilters[sectionKey] = updatedFilters[sectionKey].filter(item => item !== value);
        if (updatedFilters[sectionKey].length === 0) delete updatedFilters[sectionKey];
      } else {
        updatedFilters[sectionKey] = [...updatedFilters[sectionKey], value];
      }
    }

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const renderSection = (section, filters) => {
    const sectionKey = normalizeSectionKey(section);
    const isNested = section === "Country";
    const isOpen = openSections[section] === true;

    const filteredItems = !isNested
      ? filters.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
      : filters.map(country => ({
        ...country,
        children: country.children.filter(region =>
          region.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter(country => country.children.length > 0);

    return (
      <div key={section} className="mb-6">
        <button onClick={() => toggleSection(section)} className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-semibold rounded hover:bg-gray-300">
          <span>{section}</span>
          <svg className={`w-4 h-4 transform transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="flex flex-col gap-2 pl-2 mt-2">
            {isNested ? (
              filteredItems.map((country, i) => (
                <div key={i} className="pl-2">
                  <h4 className="font-medium mb-1">{country.label}</h4>
                  <div className="flex flex-col gap-1 pl-4">
                    {country.children.map((region, j) => (
                      <label key={j} className="flex items-start space-x-2 cursor-pointer">
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
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedFilters({});
              onFilterChange({});
              setSearchTerm("");
              setOpenSections({});
            }}
            className="w-24 h-8 border border-gray-300 rounded-md bg-orange-500 text-white text-sm"
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

const SalesforceTable = ({ selectedFields = [], onFilterChange }) => {
  const [jsonData, setJsonData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [displayFields, setDisplayFields] = useState(selectedFields);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/resources/salesforce.json");
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();
        setJsonData(data);
        setFilteredData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (jsonData.length > 0) {
      const filtered = applyFilters(jsonData, selectedFilters);
      setFilteredData(filtered);
      setCurrentPage(1);
    }
  }, [jsonData, selectedFilters]);

  useEffect(() => {
    setDisplayFields(selectedFields);
  }, [selectedFields]);

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
    if (onFilterChange) onFilterChange(filters);
  };

  const arrayIncludes = (arr, value) => {
    if (!arr) return false;
    if (Array.isArray(arr)) {
      return arr.some(item =>
        typeof item === 'string' && item.toLowerCase().includes(value.toLowerCase())
      );
    }
    if (typeof arr === 'string') {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed)) {
          return parsed.some(item =>
            typeof item === 'string' && item.toLowerCase().includes(value.toLowerCase())
          );
        }
        return arr.toLowerCase().includes(value.toLowerCase());
      } catch {
        return arr.toLowerCase().includes(value.toLowerCase());
      }
    }
    return false;
  };

  const applyFilters = (data, filters) => {
    if (!Object.keys(filters).length) return data;

    return data.filter(item => {
      let matches = true;

      if (filters.salesforceExpertise?.length) {
        const expertiseFilters = item.foundIn?.find(f => f.section === "Salesforce Expertise")?.filters || [];
        matches = matches && filters.salesforceExpertise.every(filter => expertiseFilters.includes(filter));
      }

      if (matches && filters.industryExpertise?.length) {
        const industryFilters = item.foundIn?.find(f => f.section === "Industry Expertise")?.filters || [];
        matches = matches && filters.industryExpertise.every(filter => industryFilters.includes(filter));
      }

      if (matches && filters.region?.length) {
        matches = matches && filters.region.every(filter =>
          Object.values(item.countries || {}).some(regionArray =>
            regionArray.includes(filter)
          )
        );
      }

      if (matches && filters.country?.length && !filters.region?.length) {
        matches = matches && filters.country.every(filter =>
          Object.keys(item.countries || {}).includes(filter)
        );
      }


      return matches;
    });
  };

  const handleTableSearch = (term) => {
    setTableSearchTerm(term);
    setCurrentPage(1);
  };

  const getVisibleColumns = () => {
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
    const columns = {};
    displayFields.forEach(field => {
      if (field !== 'foundIn') columns[field] = true;
    });
    return columns;
  };

  const visibleColumns = getVisibleColumns();

  const searchedData = useMemo(() => {
    if (!tableSearchTerm.trim()) return filteredData;
    const term = tableSearchTerm.toLowerCase();
    return filteredData.filter(item =>
      Object.keys(item).some(key =>
        item[key] && typeof item[key] === 'string' && item[key].toLowerCase().includes(term)
      )
    );
  }, [filteredData, tableSearchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedData.length / itemsPerPage);

  return (
    <div className="flex h-screen overflow-hidden mt-6">
      <FilterSidebar
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onFilterChange={handleFilterChange}
      />
      <div className="flex-1 overflow-auto">
        {error && <div className="text-red-600 p-4">{error}</div>}

        <div className="sticky top-0 z-20 bg-gray-100 px-6 pt-4 pb-4 mb-4 border-gray-200">
          <div className="flex items-center justify-between">
            <input
              type="text"
              placeholder="Search in table"
              value={tableSearchTerm}
              onChange={(e) => handleTableSearch(e.target.value)}
              className="w-1/3 border border-gray-300 rounded-md p-2"
            />
            <div className="flex items-center">
            <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">Show:</label>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-100">
              
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
            <span>Loading...</span>
          </div>
        ) : (
          <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed">
            <thead className="sticky top-[80px] z-10 bg-base-200 text-base font-semibold border-b border-gray-300">
              <tr>
                <th className="w-12">#</th>
                {visibleColumns.name && <th className="text-left">Name</th>}
                {visibleColumns.tagline && <th className="text-left">Tagline</th>}
                {visibleColumns.description && <th className="text-left">Description</th>}
                {visibleColumns.expertise && <th className="text-left">Expertise</th>}
                {visibleColumns.industries && <th className="text-left">Industries</th>}
                {visibleColumns.services && <th className="text-left">Services</th>}
                {visibleColumns.extendedDescription && <th className="text-left">Extended Description</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((item, index) => (
                  <tr
                    key={index}
                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                  >
                    <th className="py-2">{indexOfFirstItem + index + 1}</th>
                    {visibleColumns.name && (
                      <td className="py-2 truncate">
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {item.name}
                          </a>
                        ) : (
                          item.name
                        )}
                      </td>
                    )}
                    {visibleColumns.tagline && <td className="py-2">{item.tagline || "N/A"}</td>}
                    {visibleColumns.description && <td className="py-2">{item.description || "N/A"}</td>}
                    {visibleColumns.expertise && <td className="py-2">{item.expertise || "N/A"}</td>}
                    {visibleColumns.industries && <td className="py-2">{item.industries || "N/A"}</td>}
                    {visibleColumns.services && <td className="py-2">{item.services || "N/A"}</td>}
                    {visibleColumns.extendedDescription && <td className="py-2">{item.extendedDescription || "N/A"}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-sm text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>


        )}

        <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded ${currentPage === 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600'}`}
          >
            Previous
          </button>
          <div className="flex items-center text-gray-700">
            Page {currentPage} of {Math.max(1, totalPages)}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded ${currentPage === totalPages
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600'}`}
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
};

export default SalesforceTable;
