import React from "react";

const MicrosoftTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="flex flex-col lg:flex-row gap-8 mt-6 px-4">
            {/* Filter Section */}
            <div className="w-full lg:w-[14%] border border-gray-200 shadow-md rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Apply Filter</h2>
                <div className="flex flex-col gap-2">
                    {[
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
                        "Professional Services",
                        "Public Safety & National Security",
                        "Retail & Consumer Goods",
                        "Transportation"
                    ].map((industry, index) => (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value={industry}
                                onChange={(e) => handleFilterChange(e)} // you'll define this handler in your component
                                className="checkbox checkbox-sm"
                            />
                            <span>{industry}</span>
                        </label>
                    ))}
                </div>
            </div>
    
            {/* Data Table */}
            <div className="w-full lg:w-3/4 overflow-x-auto">
                <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
                    <thead className="bg-base-200 text-base font-semibold">
                        <tr>
                            <th className="w-[4%]">#</th>
                            <th className="w-[12%]">Partner Name</th>
                            <th className="w-[30%]">Description</th>
                            <th className="w-[30%]">Products</th>
                            <th className="w-[30%]">Solutions</th>
                            <th className="w-[30%]">Service Types</th>
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
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
    
};

export default MicrosoftTable;
