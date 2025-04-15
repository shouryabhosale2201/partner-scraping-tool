import React from "react";

const MicrosoftTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="overflow-x-auto px-4 mt-6">
            <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
                <thead className="bg-base-200 text-base font-semibold">
                    <tr>
                        <th className="w-[4%]">#</th>
                        <th className="w-[12%]">Partner Name</th>
                        <th className="w-[30%]">Description</th>
                        <th className="w-[30%]">Industry Focus</th>
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
                                    {Array.isArray(item.industryFocus)
                                        ? item.industryFocus.join(", ")
                                        : item.industryFocus}
                                </div>
                            </td>
                            <td className="py-2 w-[12rem]">
                                <div className="max-h-[100px] overflow-y-auto">
                                    {Array.isArray(item.product)
                                        ? item.product.join(", ")
                                        : item.product}
                                </div>
                            </td>
                            <td className="py-2 w-[12rem]">
                                <div className="max-h-[100px] overflow-y-auto">
                                    {Array.isArray(item.solutions) && item.solutions.length > 0
                                        ? item.solutions.join(", ")
                                        : "N/A"}
                                </div>
                            </td>
                            <td className="py-2 w-[12rem]">
                                <div className="max-h-[100px] overflow-y-auto">
                                    {Array.isArray(item.serviceType)
                                        ? item.serviceType.join(", ")
                                        : item.serviceType}
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
                        <th>Industry Focus</th>
                        <th>Products</th>
                        <th>Solutions</th>
                        <th>Service Types</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default MicrosoftTable;
