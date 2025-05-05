import React, { useState, useMemo, useEffect } from 'react';

const ShopifySidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
    const [isIndustriesOpen, setIsIndustriesOpen] = useState(false);
    const [isLocationsOpen, setIsLocationsOpen] = useState(false);

    const uniqueLanguages = useMemo(() => {
        const langs = new Set();
        data.forEach(item => item.languages?.forEach(lang => {
            if (lang && lang !== 'N/A') langs.add(lang.trim());
        }));
        return [...langs].sort();
    }, [data]);

    const uniqueIndustries = useMemo(() => {
        const inds = new Set();
        data.forEach(item => {
            if (item.industries && item.industries !== 'N/A') {
                item.industries.split(',').forEach(ind => {
                    if (ind) inds.add(ind.trim());
                });
            }
        });
        return [...inds].sort();
    }, [data]);

    const uniqueLocations = useMemo(() => {
        const countries = new Set();
        data.forEach(item => {
            item.locations?.forEach(loc => {
                if (loc && loc !== 'N/A') {
                    const parts = loc.split(',');
                    const country = parts[parts.length - 1].trim();
                    if (country) countries.add(country);
                }
            });
        });
        return [...countries].sort();
    }, [data]);

    const handleFilterToggle = (filterType, filterName) => {
        const newSelected = { ...selectedFilters };
        const key = "shopifyFilters";

        if (!newSelected[key]) newSelected[key] = {};
        if (!newSelected[key][filterType]) newSelected[key][filterType] = [];

        if (newSelected[key][filterType].includes(filterName)) {
            newSelected[key][filterType] = newSelected[key][filterType].filter(item => item !== filterName);
        } else {
            newSelected[key][filterType].push(filterName);
        }

        setSelectedFilters(newSelected);
        onFilterChange(newSelected);
    };

    const renderFilterSection = (title, filters, filterType, isOpen, setIsOpen) => (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200"
            >
                <span>{title}</span>
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

            {isOpen && (
                <div className="flex flex-col gap-2 mt-2 ml-2 max-h-64 overflow-y-auto">
                    {filters
                        .filter(filter =>
                            filter.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((filter, idx) => (
                            <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={filter}
                                    checked={selectedFilters["shopifyFilters"]?.[filterType]?.includes(filter) || false}
                                    onChange={() => handleFilterToggle(filterType, filter)}
                                    className="checkbox checkbox-sm"
                                />
                                <span>{filter}</span>
                            </label>
                        ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-1/4 min-w-[300px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen flex flex-col">
            {/* Fixed Header */}
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
                        }}
                        className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
                    >
                        Reset
                    </button>
                </div>

                <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>

                {/* Add a divider */}
                <div className="border-b border-gray-300 mb-4"></div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pl-2">
                {renderFilterSection("Languages", uniqueLanguages, "languages", isLanguagesOpen, setIsLanguagesOpen)}
                {renderFilterSection("Industries", uniqueIndustries, "industries", isIndustriesOpen, setIsIndustriesOpen)}
                {renderFilterSection("Countries", uniqueLocations, "locations", isLocationsOpen, setIsLocationsOpen)}
            </div>
        </div>
    );
};

const ShopifyTable = ({ data }) => {
    const [selectedFilters, setSelectedFilters] = useState({});
    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [partnersPerPage, setPartnersPerPage] = useState(200);

    useEffect(() => {
        const storedFilters = localStorage.getItem('shopifyFilters');
        if (storedFilters) {
            setSelectedFilters(JSON.parse(storedFilters));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('shopifyFilters', JSON.stringify(selectedFilters));
    }, [selectedFilters]);

    const handleFilterChange = (newFilters) => {
        setSelectedFilters(newFilters);
        setCurrentPage(1); // Reset to first page when filters change
    };

    const handlePageSizeChange = (e) => {
        setPartnersPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to first page when page size changes
    };

    const filteredData = useMemo(() => {
        const filters = selectedFilters["shopifyFilters"] || {};
        const selectedLanguages = filters.languages || [];
        const selectedIndustries = filters.industries || [];
        const selectedLocations = filters.locations || [];

        return data.filter(item => {
            const hasAllLanguages = selectedLanguages.length === 0 || selectedLanguages.every(lang =>
                item.languages?.some(itemLang => itemLang?.trim() === lang)
            );

            const hasAllIndustries = selectedIndustries.length === 0 || selectedIndustries.every(industry =>
                item.industries?.split(',').some(itemIndustry => itemIndustry?.trim() === industry)
            );

            const hasAllLocations = selectedLocations.length === 0 || selectedLocations.every(location =>
                item.locations?.some(itemLocation => itemLocation?.split(',').pop().trim() === location)
            );

            return hasAllLanguages && hasAllIndustries && hasAllLocations;
        });
    }, [data, selectedFilters]);

    const searchFilteredData = useMemo(() => {
        return filteredData.filter(item =>
            item.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
        );
    }, [filteredData, tableSearchTerm]);

    // Calculate pagination
    const totalPages = Math.ceil(searchFilteredData.length / partnersPerPage);
    const startIndex = (currentPage - 1) * partnersPerPage;
    const paginatedData = searchFilteredData.slice(startIndex, startIndex + partnersPerPage);

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    // Determine if buttons should be disabled
    const isPreviousDisabled = currentPage === 1;
    const isNextDisabled = currentPage === totalPages || searchFilteredData.length <= partnersPerPage;

    if (!data || data.length === 0) return null;

    return (
        <div className="flex h-screen pt-4">
            {/* Sidebar */}
            <ShopifySidebar
                data={data}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onFilterChange={handleFilterChange}
            />

            {/* Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            placeholder="Search in table"
                            value={tableSearchTerm}
                            onChange={(e) => {
                                setTableSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page when search changes
                            }}
                            className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />

                        <div className="flex items-center">
                            <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">Show:</label>
                            <select
                                id="pageSize"
                                value={partnersPerPage}
                                onChange={handlePageSizeChange}
                                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Showing {paginatedData.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + partnersPerPage, searchFilteredData.length)} of {searchFilteredData.length} partners
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pb-6">
                    <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed">
                        <thead className="sticky z-10 bg-base-200 text-base font-semibold border-b border-gray-300">
                            <tr>
                                <th className="w-12">#</th>
                                <th className="w-64 text-left">Partner Name</th>
                                <th className="w-48 text-left">Location</th>
                                <th className="w-48 text-left">Languages</th>
                                <th className="w-[200px] text-left">Industries</th>
                                <th className="w-32 text-left pr-8">Profile Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, index) => (
                                <tr
                                    key={index}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                                >
                                    <th className="py-2">{startIndex + index + 1}</th>
                                    <td className="py-2 truncate">{item.name}</td>
                                    <td className="py-2">{item.locations?.join(', ')}</td>
                                    <td className="py-2">{item.languages?.join(', ')}</td>
                                    <td className="py-2">{item.industries}</td>
                                    <td className="py-2 pr-8">
                                        <a
                                            href={item.profileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            Visit Partner
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* <tfoot>
                            <tr>
                                <th className="w-12">#</th>
                                <th className="w-64 text-left">Partner Name</th>
                                <th className="w-48 text-left">Location</th>
                                <th className="w-48 text-left">Languages</th>
                                <th className="w-[200px] text-left">Industries</th>
                                <th className="w-32 text-left pr-8">Profile Link</th>
                            </tr>
                        </tfoot> */}
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
                </div>
            </div>
        </div>
    );
};

export default ShopifyTable;