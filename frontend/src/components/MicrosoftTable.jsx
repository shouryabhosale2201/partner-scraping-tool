import React, { useState } from "react";

const MicrosoftTable = ({ data, onFilterChange }) => {
    const [selectedFilters, setSelectedFilters] = useState([]);

    const industries = [
        "Agriculture",
        "Distribution",
        "Education",
        "Financial Services",
        "Government",
        "Healthcare",
        "Hospitality & Travel",
        "Manufacturing & Resources",
        "Media & Communications",
        "Nonprofit & IGO",
        "Power & Utilities",
        "Professional services",
        "Public Safety & National Security",
        "Retail & Consumer Goods",
        "Transportation"
    ];

    const handleFilterChange = (e) => {
        const industry = e.target.value;
        const updatedFilters = selectedFilters.includes(industry)
            ? selectedFilters.filter(item => item !== industry)
            : [...selectedFilters, industry];

        setSelectedFilters(updatedFilters);
        onFilterChange(updatedFilters); // Pass selected filters to parent component
    };

    if (!data || data.length === 0) return null;

    return (
        <div className="flex h-screen overflow-hidden mt-6">
            {/* Sidebar: Filters */}
            <div className="w-1/5 min-w-[200px] border-r border-gray-200 shadow-md p-4 overflow-y-auto mt-6">
                <h2 className="text-lg font-semibold mb-4">Apply Filter</h2>
                <div className="flex flex-col gap-2">
                    {industries.map((industry, index) => (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value={industry}
                                checked={selectedFilters.includes(industry)}
                                onChange={handleFilterChange}
                                className="checkbox checkbox-sm"
                            />
                            <span>{industry}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Data Table */}
            {/* Main Content: Data Table */}
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
                        {data.map((item, index) => (
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
};

export default MicrosoftTable;