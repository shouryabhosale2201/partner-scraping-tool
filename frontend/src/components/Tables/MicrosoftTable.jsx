//microsoftTable.jsx
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
                const res = await fetch("http://localhost:5000/api/v1/microsoft/filters");
                if (!res.ok) throw new Error("Failed to fetch filters");
                const data = await res.json();
                setFilters(data);
            } catch (error) {
                console.error("Error fetching filters:", error);
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

    useEffect(() => {
        if (searchTerm) {
            setOpenSections(prev => {
                const newState = { ...prev };
                for (const type in filters) {
                    const hasMatch = filters[type].some(item =>
                        item.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    if (hasMatch) {
                        newState[type] = true;
                    }
                }
                return newState;
            });
        } else {
            setOpenSections({});
        }
    }, [searchTerm, filters]);

    const handleFilterChange = (type, value) => {
        const updatedFilters = {
            ...selectedFilters,
            [type]: selectedFilters[type]?.includes(value)
                ? selectedFilters[type].filter(item => item !== value)
                : [...(selectedFilters[type] || []), value],
        };
        setSelectedFilters(updatedFilters);
        onFilterChange(updatedFilters);
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
                            searchTerm && <span className="text-gray-500 text-sm">No matches</span>
                        )}
                    </div>
                ) : (
                    searchTerm && filteredItems.length === 0 && (
                        <div className="mt-2 ml-2 text-sm text-gray-500">No matches found. Open to view all.</div>
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
        if (!data || data.length === 0) return [];

        const firstRow = data[0];
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

    // Filter data based on selected filters
    const filteredData = data?.filter(item => {
        if (
            selectedFilters.industry?.length ||
            selectedFilters.services?.length ||
            selectedFilters.product?.length ||
            selectedFilters.solution?.length ||
            selectedFilters.country?.length
        ) {
            let matches = true; // Start with true, and disprove

            if (selectedFilters.industry?.length) {
                matches = matches && selectedFilters.industry.some(filter =>
                    item.industryFocus?.includes(filter)
                );
            }
            if (selectedFilters.services?.length) {
                matches = matches && selectedFilters.services.some(filter =>
                    item.serviceType?.includes(filter)
                );
            }
            if (selectedFilters.product?.length) {
                matches = matches && selectedFilters.product.some(filter =>
                    item.product?.includes(filter)
                );
            }
            if (selectedFilters.solution?.length) {
                matches = matches && selectedFilters.solution.some(filter =>
                    item.solutions?.includes(filter)
                );
            }
            if (selectedFilters.country?.length) {
                matches = matches && selectedFilters.country.some(filter =>
                    item.country?.includes(filter)
                );
            }

            return matches;
        }
        return true;
    }) || [];

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

        if (!value) return "N/A";

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
                        Showing {searchedData.length} results
                    </div>
                </div>

                <table className="max-w-[1470px] w-full shadow-md rounded-lg">
                    <thead className="sticky top-[80px] z-10 bg-gray-100 font-semibold">
                        <tr>
                            <th className="w-[2%] pb-2">#</th>
                            {availableColumns.map((column) => (
                                <th key={column.key} className={`${column.width} pb-2`}>
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
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 pr-3 last:border-b-0 hover:bg-gray-50 transition"
                                >
                                    <th className="py-2">{index + 1}</th>
                                    {availableColumns.map((column) => (
                                        <td key={column.key} className="py-2 pr-3">
                                            {renderCellContent(item, column)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={availableColumns.length + 1} className="text-center py-4">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* <tfoot>
                        <tr>
                            <th>#</th>
                            {availableColumns.map((column) => (
                                <th key={column.key}>{column.display}</th>
                            ))}
                        </tr>
                    </tfoot> */}
                </table>
            </div>
        </div>
    );
}