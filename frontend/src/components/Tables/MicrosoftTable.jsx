import React, { useState, useEffect } from "react";

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [filters, setFilters] = useState({
        industry: [],
        services: [],
        product: [],
        solution: [],
        country: [],
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [openSections, setOpenSections] = useState({}); // State to manage dropdown open/close

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                console.log("Fetching filters from JSON file...");
                // Fetch directly from the JSON file with proper error handling
                const response = await fetch("/resources/microsoft.json");

                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log("JSON data loaded successfully, items:", data.length);

                // Extract unique values for each filter category
                const extractUniqueValues = (field) => {
                    // First ensure we handle arrays properly
                    const allValues = data.flatMap(item => {
                        const value = item[field];
                        // Handle arrays
                        if (Array.isArray(value)) {
                            return value;
                        }
                        // Handle JSON strings that might be arrays
                        else if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                            try {
                                const parsed = JSON.parse(value);
                                return Array.isArray(parsed) ? parsed : [value];
                            } catch {
                                // If we can't parse it, treat as a string
                                return value ? [value] : [];
                            }
                        }
                        // Handle regular strings or other values
                        else if (value) {
                            return [value];
                        }
                        return [];
                    });

                    // Create a unique set and sort
                    return [...new Set(allValues)].filter(Boolean).sort();
                };

                // Build filters object
                const extractedFilters = {
                    product: extractUniqueValues('product'),
                    solution: extractUniqueValues('solutions'),
                    services: extractUniqueValues('serviceType'),
                    industry: extractUniqueValues('industryFocus'),
                    country: extractUniqueValues('country')
                };

                // Debug output to see if values are being extracted
                Object.entries(extractedFilters).forEach(([key, values]) => {
                    console.log(`${key} filters: ${values.length} values found`);
                });

                setFilters(extractedFilters);
            } catch (error) {
                console.error("Error fetching filters from JSON file:", error);
                // Set default empty filters on error
                setFilters({
                    industry: [],
                    services: [],
                    product: [],
                    solution: [],
                    country: [],
                });
            }
        };

        fetchFilters();
    }, []);

    const handleFilterChange = (type, value) => {
        // Create a copy of current filters
        const newFilters = { ...selectedFilters };

        // Initialize the array if it doesn't exist
        if (!newFilters[type]) newFilters[type] = [];

        // Check if value is already selected
        if (newFilters[type].includes(value)) {
            // If selected, remove it
            newFilters[type] = newFilters[type].filter(item => item !== value);
        } else {
            // If not selected, add it
            newFilters[type].push(value);
        }

        // Update state and notify parent
        setSelectedFilters(newFilters);
        onFilterChange(newFilters);
    };

    const toggleSection = (sectionName) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    };

    const renderFilterSection = (title, items, type) => {
        const filteredItems = items.filter(item =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const isOpen = openSections[type] === true; // Get open state

        return (
            <div className="mb-6">
                <button
                    onClick={() => toggleSection(type)} // Use toggleSection
                    className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-semibold rounded hover:bg-gray-300"
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
                {isOpen ? ( // Conditionally render content
                    <div className="flex flex-col gap-2 pl-2 mt-2 max-h-64 overflow-y-auto">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item, index) => (
                                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={item}
                                        checked={selectedFilters[type]?.includes(item) || false}
                                        onChange={() => handleFilterChange(type, item)}
                                        className="checkbox checkbox-sm"
                                    />
                                    <span>{item}</span>
                                </label>
                            ))
                        ) : (
                            <span className="text-gray-500 text-sm">No matches found </span>
                        )}
                    </div>
                ) : (
                    searchTerm && filteredItems.length === 0 && (
                        <div className="mt-2 ml-2 text-sm text-gray-500">No matches found</div>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="w-1/7 min-w-[250px] border-r border-gray-200 shadow-md p-4 h-screen flex flex-col">
            <div className="sticky top-0 z-10 bg-gray-100 p-2 pb-4">
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
                            setSelectedFilters({
                                industry: [],
                                services: [],
                                product: [],
                                solution: [],
                                country: []
                            });
                            onFilterChange({
                                industry: [],
                                services: [],
                                product: [],
                                solution: [],
                                country: []
                            });
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

            <div className="overflow-y-auto flex-1 pl-2">
                {renderFilterSection("Industry", filters.industry, "industry")}
                {renderFilterSection("Services", filters.services, "services")}
                {renderFilterSection("Product", filters.product, "product")}
                {renderFilterSection("Solution", filters.solution, "solution")}
                {renderFilterSection("Location", filters.country, "country")}
            </div>
        </div>
    );
};


export default function MicrosoftTable({ data, onFilterChange }) {
    const [selectedFilters, setSelectedFilters] = useState({
        industry: [],
        services: [],
        product: [],
        solution: [],
        country: []
    });

    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [jsonData, setJsonData] = useState(data || []);

    useEffect(() => {
        // If no data is provided, try to fetch it directly
        if (!data || data.length === 0) {
            console.log("No data provided via props, fetching directly...");
            const fetchData = async () => {
                try {
                    const response = await fetch("/resources/microsoft.json");

                    if (!response.ok) {
                        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                    }

                    const jsonData = await response.json();
                    console.log(`Fetched ${jsonData.length} records from JSON file`);
                    setJsonData(jsonData);
                } catch (error) {
                    console.error("Error fetching data from JSON file:", error);
                    setJsonData([]);
                }
            };

            fetchData();
        } else {
            console.log(`Using ${data.length} records provided via props`);
            setJsonData(data);
        }
    }, [data]);

    // Determine which columns are actually available in the data
    const columnMapping = {
        'name': { display: 'Partner Name', width: '12%' },
        'description': { display: 'Description', width: '25%' },
        'country': { display: 'Country', width: '15%' },
        'product': { display: 'Products', width: '15%' },
        'solutions': { display: 'Solutions', width: '15%' },
        'serviceType': { display: 'Service Types', width: '15%' },
        'industryFocus': { display: 'Industry Focus', width: '15%' }
    };

    // Dynamically generate column list based on what's in the data
    const getAvailableColumns = () => {
        if (!jsonData || jsonData.length === 0) return [];

        const firstRow = jsonData[0];
        return Object.keys(firstRow)
            .filter(key => key !== 'id' && key !== 'link') // Exclude id and link columns
            .map(key => ({
                key,
                display: columnMapping[key]?.display || key,
                width: columnMapping[key]?.width || '15%'
            }));
    };

    const availableColumns = getAvailableColumns();

    const handleFilterChange = (updatedFilters) => {
        setSelectedFilters(updatedFilters);
        if (onFilterChange) {
            onFilterChange(updatedFilters);
        }
    };

    // Helper function to safely check if an array includes a value
    const arrayIncludes = (arr, value) => {
        if (!arr) return false;

        // If it's already an array, check directly
        if (Array.isArray(arr)) {
            return arr.some(item =>
                typeof item === 'string' &&
                item.toLowerCase().includes(value.toLowerCase())
            );
        }

        // If it's a stringified JSON array
        if (typeof arr === 'string' && (arr.startsWith('[') || arr.startsWith('{'))) {
            try {
                const parsed = JSON.parse(arr);
                if (Array.isArray(parsed)) {
                    return parsed.some(item =>
                        typeof item === 'string' &&
                        item.toLowerCase().includes(value.toLowerCase())
                    );
                }
                // If it parsed but isn't an array
                return String(arr).toLowerCase().includes(value.toLowerCase());
            } catch {
                // If parsing failed, treat as string
                return String(arr).toLowerCase().includes(value.toLowerCase());
            }
        }

        // For simple strings
        return String(arr).toLowerCase().includes(value.toLowerCase());
    };

    // Add debug logging
    console.log("Current filters:", selectedFilters);
    console.log("Available data items:", jsonData?.length || 0);

    // Filter data based on selected filters
    const filteredData = jsonData?.filter(item => {
        // If no filters are selected, return all items
        if (!Object.values(selectedFilters).some(arr => arr && arr.length > 0)) {
            return true;
        }

        let matches = true;

        if (selectedFilters.industry?.length > 0) {
            const hasMatch = selectedFilters.industry.some(filter => {
                const result = arrayIncludes(item.industryFocus, filter);
                return result;
            });
            matches = matches && hasMatch;
        }

        if (matches && selectedFilters.services?.length > 0) {
            const hasMatch = selectedFilters.services.some(filter =>
                arrayIncludes(item.serviceType, filter)
            );
            matches = matches && hasMatch;
        }

        if (matches && selectedFilters.product?.length > 0) {
            const hasMatch = selectedFilters.product.some(filter =>
                arrayIncludes(item.product, filter)
            );
            matches = matches && hasMatch;
        }

        if (matches && selectedFilters.solution?.length > 0) {
            const hasMatch = selectedFilters.solution.some(filter =>
                arrayIncludes(item.solutions, filter)
            );
            matches = matches && hasMatch;
        }

        if (matches && selectedFilters.country?.length > 0) {
            const hasMatch = selectedFilters.country.some(filter =>
                arrayIncludes(item.country, filter)
            );
            matches = matches && hasMatch;
        }

        return matches;
    }) || [];

    console.log("Filtered data count:", filteredData.length);

    // Apply table search
    const searchedData = filteredData.filter(item => {
        if (!tableSearchTerm) return true;
        return availableColumns.some(column => {
            const value = item[column.key];
            if (!value) return false;
            if (Array.isArray(value)) {
                return value.join(", ").toLowerCase().includes(tableSearchTerm.toLowerCase());
            } else {
                return String(value).toLowerCase().includes(tableSearchTerm.toLowerCase());
            }
        });
    });

    // Render cell content properly handling different data types
    const renderCellContent = (item, column) => {
        const value = item[column.key];

        if (value === undefined || value === null) return "N/A";

        // If the column is 'name', wrap it in a link (anchor tag)
        if (column.key === 'name' && item.link) {
            return (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {value}
                </a>
            );
        }

        // Handle array data (stored as JSON strings or actual arrays)
        let content;
        if (Array.isArray(value)) {
            content = value.join(", ");
        } else if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            // Try to parse JSON strings
            try {
                const parsed = JSON.parse(value);
                content = Array.isArray(parsed) ? parsed.join(", ") : value;
            } catch {
                content = value;
            }
        } else {
            content = value;
        }

        return (
            <div className="max-h-[100px] overflow-y-auto whitespace-pre-line">
                {content}
            </div>
        );
    };

    return (
        <div className="flex h-screen overflow-hidden mt-6">
            <FilterSidebar
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onFilterChange={handleFilterChange}
            />

            <div className="flex-1 overflow-auto">
                <div className="sticky top-0 z-30 bg-gray-100 px-6 pt-6 pb-4 border-b border-gray-300">
                    <input
                        type="text"
                        placeholder="Search in table"
                        value={tableSearchTerm}
                        onChange={(e) => setTableSearchTerm(e.target.value)}
                        className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-sm text-gray-600 mt-2">
                        Showing {searchedData.length} results {jsonData.length > 0 && filteredData.length === 0 ? "(All filtered out)" : ""}
                    </div>
                </div>

                <div className="p-4">
                    <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed">
                        <thead className="sticky top-[80px] z-10 bg-base-200 text-base font-semibold border-b border-gray-300">
                            <tr>
                                <th className="w-12">#</th>
                                {availableColumns.map((column) => (
                                    <th key={column.key} className={`${column.width} text-left`}>
                                        {column.display}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {searchedData.length > 0 ? (
                                searchedData.map((item, index) => (
                                    <tr
                                        key={index}
                                        className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                                    >
                                        <th className="py-2">{index + 1}</th>
                                        {availableColumns.map((column) => (
                                            <td key={column.key} className="py-2 pr-3 truncate">
                                                {renderCellContent(item, column)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={availableColumns.length + 1} className="text-center py-4 text-sm text-gray-500">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                </div>
            </div>
        </div>
    );
}
