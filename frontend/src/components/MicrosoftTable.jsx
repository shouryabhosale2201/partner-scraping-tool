import { useState, useEffect } from "react";

const FilterSidebar = ({ selectedFilters, setSelectedFilters, onFilterChange }) => {
    const [filters, setFilters] = useState({
        industry: [],
        services: [],
        product: [],
        solution: []
    });

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/v1/microsoft/filters");
                if (!res.ok) throw new Error("Failed to fetch filters");
                const data = await res.json();
                setFilters(data);
                console.log(data);
            } catch (error) {
                console.error("Error fetching filters:", error);
                setFilters({
                    industry: [],
                    services: [],
                    product: [],
                    solution: []
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

    const renderFilterSection = (title, items, type) => (
        <div className="mb-6">
            <h3 className="text-md font-semibold mb-2 capitalize">{title}</h3>
            <div className="flex flex-col gap-2">
                {items.map((item, index) => (
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
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-1/5 min-w-[250px] border-r border-gray-200 shadow-md p-4 overflow-y-auto mt-6">
            <h2 className="text-lg font-semibold mb-4">Apply Filters</h2>
            {renderFilterSection("Industry", filters.industry, "industry")}
            {renderFilterSection("Services", filters.services, "services")}
            {renderFilterSection("Product", filters.product, "product")}
            {renderFilterSection("Solution", filters.solution, "solution")}
        </div>
    );
};


export default function MicrosoftTable({ data }) {
    const [selectedFilters, setSelectedFilters] = useState({
        industry: [],
        services: [],
        product: [],
        solution: []
    });

    const handleFilterChange = (updatedFilters) => {
        setSelectedFilters(updatedFilters);
    };

    const matchesFilter = (item, type, key) => {
        const selected = selectedFilters[type];
        if (!selected || selected.length === 0) return true;

        try {
            const values = JSON.parse(item[key]);
            return selected.some(value => values.includes(value));
        } catch {
            return false;
        }
    };

    const filteredData = data.filter(item =>
        matchesFilter(item, "industry", "industryFocus") &&
        matchesFilter(item, "services", "serviceType") &&
        matchesFilter(item, "product", "product") &&
        matchesFilter(item, "solution", "solutions")
    );

    return (
        <div className="flex h-screen overflow-hidden mt-6">
            <FilterSidebar
                data={data}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onFilterChange={handleFilterChange}
            />

            <div className="flex-1 overflow-auto">
                <table className="min-w-full border border-gray-200 shadow-md rounded-lg">
                    <thead className="bg-base-200 text-base font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="w-[4%]">#</th>
                            <th className="w-[12%]">Partner Name</th>
                            <th className="w-[30%]">Description</th>
                            <th className="w-[30%]">Products</th>
                            <th className="w-[30%]">Solutions</th>
                            <th className="w-[30%]">Service Types</th>
                            <th className="w-[30%]">Industry Focus</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, index) => (
                            <tr
                                key={index}
                                className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                            >
                                <th className="py-2">{index + 1}</th>
                                <td className="py-2">{item.name}</td>
                                <td className="py-2 w-[20rem]">
                                    <div className="max-h-[100px] overflow-y-auto whitespace-pre-line">
                                        {item.description}
                                    </div>
                                </td>
                                <td className="py-2 w-[12rem]">
                                    <div className="max-h-[100px] overflow-y-auto">
                                        {Array.isArray(item.product) ? item.product.join(", ") : item.product}
                                    </div>
                                </td>
                                <td className="py-2 w-[12rem]">
                                    <div className="max-h-[100px] overflow-y-auto">
                                        {Array.isArray(item.solutions) && item.solutions.length > 0 ? item.solutions.join(", ") : "N/A"}
                                    </div>
                                </td>
                                <td className="py-2 w-[12rem]">
                                    <div className="max-h-[100px] overflow-y-auto">
                                        {Array.isArray(item.serviceType) ? item.serviceType.join(", ") : item.serviceType}
                                    </div>
                                </td>
                                <td className="py-2 w-[12rem]">
                                    <div className="max-h-[100px] overflow-y-auto">
                                        {Array.isArray(item.industryFocus) ? item.industryFocus.join(", ") : item.industryFocus || "N/A"}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>#</th>
                            <th>Partner Name</th>
                            <th>Description</th>
                            <th>Products</th>
                            <th>Solutions</th>
                            <th>Service Types</th>
                            <th>Industry Focus</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
