import React, { useState, useMemo, useEffect } from "react";

const OracleSidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [openSections, setOpenSections] = useState({});
    const [noMatch, setNoMatch] = useState({}); // Track "No match found" messages

    const hierarchy = useMemo(() => {
        const map = new Map();

        for (const partner of data) {
            for (const filter of partner.filters || []) {
                if (!filter.level1Name || !filter.level2Name || !filter.level3Name || !filter.level4Name) continue;

                if (!map.has(filter.level1Name)) map.set(filter.level1Name, new Map());
                const level2Map = map.get(filter.level1Name);

                if (!level2Map.has(filter.level2Name)) level2Map.set(filter.level2Name, new Map());
                const level3Map = level2Map.get(filter.level2Name);

                if (!level3Map.has(filter.level3Name)) level3Map.set(filter.level3Name, new Set());
                const level4Set = level3Map.get(filter.level3Name);

                level4Set.add(filter.level4Name);
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

    useEffect(() => {
        setNoMatch({});
        setOpenSections({});

        if (searchTerm) {
            const newOpenSections = { locations: true };
            const newNoMatch = { hierarchy: {} };
            let foundMatchOverall = false;

            const searchResults = {
                locations: new Set(),
                hierarchyMatches: new Map(), // level1Name -> { level2Name -> { level3Name -> Set<level4Name> } }
            };

            // Search through the data
            const trimmedSearchTerm = searchTerm.trim().toLowerCase();

            for (const partner of data) {
                // Search locations
                for (const loc of partner.locations || []) {
                    if (loc.toLowerCase().includes(trimmedSearchTerm)) {
                        searchResults.locations.add(loc);
                        foundMatchOverall = true;
                        break; // Found a match for this partner's location
                    }
                }

                // Search hierarchy
                for (const filter of partner.filters || []) {
                    const filterNameLower = filter.level4Name?.toLowerCase();
                    if (filterNameLower?.includes(trimmedSearchTerm)) {
                        foundMatchOverall = true;
                        if (!searchResults.hierarchyMatches.has(filter.level1Name)) {
                            searchResults.hierarchyMatches.set(filter.level1Name, new Map());
                        }
                        const level2Map = searchResults.hierarchyMatches.get(filter.level1Name);
                        if (!level2Map.has(filter.level2Name)) {
                            level2Map.set(filter.level2Name, new Map());
                        }
                        const level3Map = level2Map.get(filter.level2Name);
                        if (!level3Map.has(filter.level3Name)) {
                            level3Map.set(filter.level3Name, new Set());
                        }
                        level3Map.get(filter.level3Name)?.add(filter.level4Name);
                    }
                }
            }

            // Update openSections based on search results
            searchResults.hierarchyMatches.forEach((level2Map, level1Name) => {
                newOpenSections[level1Name] = true;
            });

            // Update noMatch based on search results
            if (searchTerm) {
                // Locations no match
                if (searchResults.locations.size === 0) {
                    newNoMatch["locations"] = true;
                }

                // Hierarchy no match
                const hierarchyNoMatch = {};
                hierarchy.forEach((level2Map, level1Name) => {
                    if (!searchResults.hierarchyMatches.has(level1Name) && !level1Name.toLowerCase().includes(trimmedSearchTerm)) {
                        hierarchyNoMatch[level1Name] = {};
                    } else if (searchResults.hierarchyMatches.has(level1Name)) {
                        const level2NoMatch = {};
                        level2Map.forEach((level3Map, level2Name) => {
                            if (!searchResults.hierarchyMatches.get(level1Name)?.has(level2Name) && !level2Name.toLowerCase().includes(trimmedSearchTerm)) {
                                level2NoMatch[level2Name] = {};
                            } else if (searchResults.hierarchyMatches.get(level1Name)?.has(level2Name)) {
                                const level3NoMatch = {};
                                level3Map.forEach((level4Set, level3Name) => {
                                    if (!searchResults.hierarchyMatches.get(level1Name)?.get(level2Name)?.has(level3Name) && !level3Name.toLowerCase().includes(trimmedSearchTerm)) {
                                        level3NoMatch[level3Name] = true;
                                    }
                                });
                                if (Object.keys(level3NoMatch).length > 0) {
                                    level2NoMatch[level2Name] = level3NoMatch;
                                }
                            } else if (!level2Name.toLowerCase().includes(trimmedSearchTerm)) {
                                level2NoMatch[level2Name] = {};
                            }
                        });
                        if (Object.keys(level2NoMatch).length > 0) {
                            hierarchyNoMatch[level1Name] = level2NoMatch;
                        }
                    } else if (!level1Name.toLowerCase().includes(trimmedSearchTerm)) {
                        hierarchyNoMatch[level1Name] = {};
                    }
                });
                newNoMatch["hierarchy"] = hierarchyNoMatch;
            }

            setOpenSections(newOpenSections);
            setNoMatch(newNoMatch);

        } else {
            setOpenSections({});
            setNoMatch({});
        }
    }, [searchTerm, data, hierarchy]);

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

    const toggleSection = (sectionName) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    };

    // Helper Functions
    const searchResultsExistForLevel1 = (level1Name) => {
        return searchTerm && !!(noMatch.hierarchy && noMatch.hierarchy[level1Name] === undefined);
    };

    const searchResultsExistForLevel2 = (level1Name, level2Name) => {
        return searchTerm && !!(noMatch.hierarchy && noMatch.hierarchy[level1Name] && noMatch.hierarchy[level1Name][level2Name] === undefined);
    };

    const renderHierarchy = () => {
        const key = "oracleFilters";
        return Array.from(hierarchy.entries()).map(([level1Name, level2Map]) => {
            const level1Open = openSections[level1Name] === true;
            const showDropdown = level1Name === "Cloud Solution Builders & ISVs" || level1Name === "Cloud Services Partners";
            const level1NoMatch = noMatch.hierarchy?.[level1Name];
            const hasMatchingChildren = searchTerm && searchResultsExistForLevel1(level1Name);

            const shouldRenderLevel1 = !searchTerm || hasMatchingChildren || level1NoMatch;

            if (!shouldRenderLevel1 && searchTerm) {
                return null;
            }

            return (
                <div key={level1Name} className="mb-4">
                    <button
                        onClick={() => {
                            if (showDropdown) {
                                toggleSection(level1Name);
                            }
                        }}
                        className={`w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200 ${showDropdown ? "cursor-pointer" : ""}`}
                    >
                        <span>{level1Name}</span>
                        {showDropdown && (
                            <svg
                                className={`w-4 h-4 transform transition-transform ${level1Open ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                    </button>
                    {level1Open && showDropdown && (
                        <div className="ml-4">
                            {Array.from(level2Map.entries()).map(([level2Name, level3Map]) => {
                                const level2NoMatch = level1NoMatch?.[level2Name];
                                const hasMatchingLevel3 = searchTerm && searchResultsExistForLevel2(level1Name, level2Name);

                                const shouldRenderLevel2 = !searchTerm || hasMatchingLevel3 || level2NoMatch;

                                if (!shouldRenderLevel2 && searchTerm) {
                                    return null;
                                }

                                return (
                                    <div key={level2Name} className="mb-2">
                                        <h4 className="text-sm ml-4 mb-1">
                                            {level2Name}
                                            {searchTerm && !hasMatchingLevel3 && level2NoMatch && Object.keys(level2NoMatch).length > 0 && (
                                                <span className="text-gray-500 text-xs ml-2">(No matches found)</span>
                                            )}
                                        </h4>
                                        {Array.from(level3Map.entries()).map(([level3Name, level4Set]) => {
                                            const hasMatchingLevel4 = searchTerm && Array.from(level4Set).some(ln => ln.toLowerCase().includes(searchTerm.toLowerCase()));
                                            const level3NoMatch = level2NoMatch?.[level3Name];

                                            const shouldRenderLevel3 = !searchTerm || hasMatchingLevel4 || level3NoMatch;

                                            if (!shouldRenderLevel3 && searchTerm) {
                                                return null;
                                            }

                                            return (
                                                <div key={level3Name} className="mb-2">
                                                    <h5 className="text-sm font-medium ml-8 mb-1">
                                                        {level3Name}
                                                        {searchTerm && !hasMatchingLevel4 && level3NoMatch && (
                                                            <span className="text-gray-500 text-xs ml-2">(No matches found)</span>
                                                        )}
                                                    </h5>
                                                    <div className="ml-8 flex flex-col gap-2">
                                                        {searchTerm && !hasMatchingLevel4 && level3NoMatch ? (
                                                            <span className="text-gray-500 text-sm">No matches found</span>
                                                        ) : (
                                                            Array.from(level4Set)
                                                                .filter(level4Name => {
                                                                    const match = !searchTerm || level4Name.toLowerCase().includes(searchTerm.toLowerCase());
                                                                    return match;
                                                                })
                                                                .map((level4Name, idx) => {
                                                                    const isSelected = selectedFilters[key]?.includes(level4Name) || false;
                                                                    return (
                                                                        <label key={idx} className="flex items-center space-x-2 cursor-pointer text-xs">
                                                                            <input
                                                                                type="checkbox"
                                                                                value={level4Name}
                                                                                checked={isSelected}
                                                                                onChange={() => handleFilterToggle(level4Name)}
                                                                                className="checkbox checkbox-sm"
                                                                            />
                                                                            <span>{level4Name}</span>
                                                                        </label>
                                                                    );
                                                                })
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {searchTerm && showDropdown && !searchResultsExistForLevel1(level1Name) && (
                        <div className="ml-4 text-gray-500 text-sm">(No matches found)</div>
                    )}
                </div>
            );
        });
    };

    const renderLocations = () => {
        const key = "oracleFilters";
        const isOpen = openSections["locations"] === true;
        const filteredLocations = Array.from(locationSet).filter(location =>
            !searchTerm || location.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const hasLocationMatch = filteredLocations.length > 0;
        const showNoMatch = searchTerm && !hasLocationMatch && noMatch["locations"];

        return (
            <div className="mb-6">
                <button
                    onClick={() => toggleSection("locations")}
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
                        {hasLocationMatch ? (
                            filteredLocations.map((location, idx) => (
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
                            ))
                        ) : (
                            searchTerm && showNoMatch && (
                                <span className="text-gray-500 text-sm">No matches found</span>
                            )
                        )}
                    </div>
                )}
                {showNoMatch && !hasLocationMatch && searchTerm && (
                    <div className="mt-2 ml-2 text-gray-500 text-sm">(No matches found)</div>
                )}
            </div>
        );
    };

    return (
        <div className="w-1/4 min-w-[300px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen flex flex-col sticky top-0 overflow-y-auto">
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
                            setOpenSections({});
                            setNoMatch({});
                        }}
                        className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
                    >
                        Reset
                    </button>
                </div>

                <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
                <div className="border-b border-gray-300 mb-4"></div>
            </div>

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
    const [partnersPerPage, setPartnersPerPage] = useState(200);

    if (!data || data.length === 0) return null;

    const handleFilterChange = (newFilters) => {
        setSelectedFilters(newFilters);
        setCurrentPage(1);
    };

    const filteredData = useMemo(() => {
        const key = "oracleFilters";
        const selected = selectedFilters[key];
        if (!selected || selected.length === 0) return data;

        const selectedExpertise = [];
        const selectedLocations = [];

        selected.forEach(item => {
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
            const expertiseMatch = selectedExpertise.length === 0 ||
                selectedExpertise.every(exp =>
                    item.filters?.some(f => f.level4Name === exp)
                );

            const locationMatch = selectedLocations.length === 0 ||
                selectedLocations.every(loc =>
                    item.locations?.includes(loc)
                );

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
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            placeholder="Search in table"
                            value={tableSearchTerm}
                            onChange={(e) => {
                                setTableSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center">
                            <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">Show:</label>
                            <select
                                value={partnersPerPage}
                                onChange={(e) => {
                                    setPartnersPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset to first page when page size changes
                                }}
                                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-100"
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
                        <thead className="sticky z-10 bg-base-200 text-base font-semibold">
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
