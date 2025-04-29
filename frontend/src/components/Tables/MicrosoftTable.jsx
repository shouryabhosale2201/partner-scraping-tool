// MicrosoftTable.jsx

import { useState, useEffect } from "react";

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [filters, setFilters] = useState({
        industry: [],
        services: [],
        product: [],
        solution: [],
        country:[],
    });
    const [searchTerm, setSearchTerm] = useState("");

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

    const handleFilterChange = (type, value) => {
        const updatedFilters = {
            ...selectedFilters,
            [type]: selectedFilters[type]?.includes(value)
                ? selectedFilters[type].filter(item => item !== value)
                : [...(selectedFilters[type] || []), value]
        };
        setSelectedFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    const renderFilterSection = (title, items, type) => {
        const filteredItems = items.filter(item =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="mb-6">
                <h3 className="text-md font-semibold mb-2 capitalize">{title}</h3>
                <div className="flex flex-col gap-2">
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
                        }}
                        className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm"
                    >
                        Reset
                    </button>
                </div>
                <h2 className="text-lg font-semibold mb-4">Apply Filters</h2>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-180px)] pl-2">
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
        'country':{display: 'Country', width:'15%'},
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
            .filter(key => key !== 'id' && key !== 'link') // Exclude id column
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

    // Filter data based on search term
    const filteredData = data?.filter(item => {
        if (!tableSearchTerm) return true;

        // Search across all available columns
        return availableColumns.some(column => {
            const value = item[column.key];
            if (!value) return false;

            if (Array.isArray(value)) {
                return value.join(", ").toLowerCase().includes(tableSearchTerm.toLowerCase());
            } else {
                return String(value).toLowerCase().includes(tableSearchTerm.toLowerCase());
            }
        });
    }) || [];

    // Render cell content properly handling different data types
    const renderCellContent = (item, column) => {
        const value = item[column.key];

        if (!value) return "N/A";
<<<<<<< HEAD:frontend/src/components/MicrosoftTable.jsx
        
        // If the column is 'name', wrap it in a link (anchor tag)
    if (column.key === 'name' && item.link) {
        return (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {value}
            </a>
        );
    }
    
=======

>>>>>>> 3cdc40549276ee75154e7c2d4c74e234a0ae45c9:frontend/src/components/Tables/MicrosoftTable.jsx
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
                </div>

<<<<<<< HEAD:frontend/src/components/MicrosoftTable.jsx
                <table className="min-w-[1000px] w-full shadow-md rounded-lg">
                    <thead className="sticky top-[80px] z-10 bg-gray-100 font-semibold">
=======
                <table className="min-w-full shadow-md rounded-lg">
                    <thead className="sticky top-[80px] z-20 bg-gray-100 text-base font-semibold border-b border-gray-300">

>>>>>>> 3cdc40549276ee75154e7c2d4c74e234a0ae45c9:frontend/src/components/Tables/MicrosoftTable.jsx
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
                        {filteredData.length > 0 ? (
                            filteredData.map((item, index) => (
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
                    <tfoot>
                        <tr>
                            <th>#</th>
                            {availableColumns.map((column) => (
                                <th key={column.key}>{column.display}</th>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}