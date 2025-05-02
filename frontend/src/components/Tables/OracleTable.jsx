import React, { useState, useMemo } from "react";

const OracleSidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const handleFilterToggle = (filterName) => {
        const newSelected = { ...selectedFilters };
        const key = "oracleFilters";

        if (!newSelected[key]) newSelected[key] = [];

        if (newSelected[key].includes(filterName)) {
            newSelected[key] = newSelected[key].filter(item => item !== filterName);
        } else {
            newSelected[key].push(filterName);
        }

        setSelectedFilters(newSelected);
        onFilterChange(newSelected);
    };

    const hierarchy = useMemo(() => {
        const map = new Map();

        // Loop through every partner
        for (const partner of data) {
            for (const filter of partner.filters || []) {
                if (!filter.level1Name || !filter.level2Name || !filter.level3Name || !filter.level4Name) continue;

                if (!map.has(filter.level1Name)) map.set(filter.level1Name, new Map());
                const level2Map = map.get(filter.level1Name);

                if (!level2Map.has(filter.level2Name)) level2Map.set(filter.level2Name, new Map());
                const level3Map = level2Map.get(filter.level2Name);

                if (!level3Map.has(filter.level3Name)) level3Map.set(filter.level3Name, new Set());
                const level4Set = level3Map.get(filter.level3Name);

                level4Set.add(filter.level4Name); // Using Set to avoid duplicates
            }
        }

        return map;
    }, [data]);

    const locationSet = useMemo(() => {
        const set = new Set();
        for (const partner of data) {
            for (const loc of partner.locations || []) {
                set.add(loc);
            }
        }
        return set;
    }, [data]);


    const renderHierarchy = () => {
        const key = "oracleFilters";
        return Array.from(hierarchy.entries()).map(([level1Name, level2Map]) => (
            <div key={level1Name} className="mb-4">
                <h3 className="text-md font-bold mb-2">{level1Name}</h3>
                {Array.from(level2Map.entries()).map(([level2Name, level3Map]) => (
                    <div key={level2Name} className="ml-4 mb-2">
                        <h4 className="text-sm font-semibold mb-1">{level2Name}</h4>
                        {Array.from(level3Map.entries()).map(([level3Name, level4Set]) => (
                            <div key={level3Name} className="ml-4 mb-2">
                                <h5 className="text-sm font-medium mb-1">{level3Name}</h5>
                                <div className="flex flex-col gap-2 ml-2">
                                    {Array.from(level4Set)
                                        .filter(level4Name =>
                                            level4Name.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((level4Name, idx) => (
                                            <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    value={level4Name}
                                                    checked={selectedFilters[key]?.includes(level4Name) || false}
                                                    onChange={() => handleFilterToggle(level4Name)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span>{level4Name}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        ));
    };

    const renderLocations = () => {
        const key = "oracleFilters";
        const [isOpen, setIsOpen] = useState(false); // toggle dropdown
    
        const filteredLocations = Array.from(locationSet).filter(location =>
            location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
        return (
            <div className="mb-6">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200"
                >
                    <span>Countries (APAC)</span>
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
                        {filteredLocations.map((location, idx) => (
                            <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={location}
                                    checked={selectedFilters[key]?.includes(location) || false}
                                    onChange={() => handleFilterToggle(location)}
                                    className="checkbox checkbox-sm"
                                />
                                <span>{location}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    


    return (
        <div className="w-1/4 min-w-[400px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen flex flex-col">
            {/* Fixed Header */}
            <div className="sticky top-0 z-10 bg-gray-100 pb-4">
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

                <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
                
                {/* Add a divider to clearly separate the fixed header from scrollable content */}
                <div className="border-b border-gray-300 mb-4"></div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pl-2">
                {renderLocations()}
                {renderHierarchy()}
            </div>
        </div>
    );
};

const OracleTable = ({ data }) => {
    const [selectedFilters, setSelectedFilters] = useState({});
    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const partnersPerPage = 200;
    
    if (!data || data.length === 0) return null;

    // Filter the data based on selected filters
    const handleFilterChange = (newFilters) => {
        setSelectedFilters(newFilters);
        setCurrentPage(1); // Reset to first page when filters change
    };

    const filteredData = useMemo(() => {
        const key = "oracleFilters";
        const selected = selectedFilters[key];
        if (!selected || selected.length === 0) return data;

        // Split the selected filters into expertise and location groups
        const selectedExpertise = [];
        const selectedLocations = [];
        
        // Categorize the selections
        selected.forEach(item => {
            // Check if this item exists in any partner's filters (expertise) or locations
            const isExpertise = data.some(partner => 
                partner.filters?.some(f => f.level4Name === item)
            );
            
            const isLocation = data.some(partner => 
                partner.locations?.some(loc => loc === item)
            );
            
            if (isExpertise) selectedExpertise.push(item);
            if (isLocation) selectedLocations.push(item);
        });

        return data.filter((item) => {
            // For expertise: ALL selected expertise must match (AND logic)
            const expertiseMatch = selectedExpertise.length === 0 || 
                selectedExpertise.every(exp => 
                    item.filters?.some(f => f.level4Name === exp)
                );
            
            // For locations: ALL selected locations must match (AND logic)
            const locationMatch = selectedLocations.length === 0 || 
                selectedLocations.every(loc => 
                    item.locations?.includes(loc)
                );
            
            // Between expertise and location categories, use OR logic
            return (selectedExpertise.length > 0 && expertiseMatch) || 
                   (selectedLocations.length > 0 && locationMatch);
        });
    }, [data, selectedFilters]);

    const searchFilteredData = useMemo(() => {
        return filteredData.filter((item) =>
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

    return (
        <div className="flex h-screen pt-4">
            {/* Sidebar */}
            <OracleSidebar
                data={data}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onFilterChange={handleFilterChange}
            />

            {/* Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
                    <input
                        type="text"
                        placeholder="Search in table"
                        value={tableSearchTerm}
                        onChange={(e) => {
                            setTableSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page when search changes
                        }}
                        className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                                <th className="w-20 text-left">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr
                                    key={item.id || item.serialNumber}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                                >
                                    <th className="py-2">{item.serialNumber}</th>
                                    <td className="py-2 truncate">{item.name}</td>
                                    <td className="py-2">
                                        <a
                                            href={item.link}
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
                        <tfoot>
                            <tr>
                                <th className="w-12">#</th>
                                <th className="w-64 text-left">Partner Name</th>
                                <th className="w-20 text-left">Link</th>
                            </tr>
                        </tfoot>
                    </table>
                    
                    {/* Pagination Controls */}
                    <div className="mt-4 flex justify-center space-x-4">
                        <button 
                            onClick={handlePreviousPage} 
                            disabled={isPreviousDisabled}
                            className={`px-4 py-2 rounded ${
                                isPreviousDisabled 
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
                            className={`px-4 py-2 rounded ${
                                isNextDisabled 
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

export default OracleTable;