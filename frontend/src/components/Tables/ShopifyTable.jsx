import React from "react";

const ShopifyTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="overflow-x-auto px-4 mt-6">
            <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
                <thead className="bg-base-200 text-base font-semibold">
                    <tr>
                        <th className="w-[4%]">#</th>
                        <th className="w-[12%]">Partner Name</th>
                        <th className="w-[24%]">Business Description</th>
                        <th className="w-[30%]">Specialized Services</th>
                        <th className="w-[30%]">Featured Work</th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((item, index) => (
                        <tr
                            key={index}
                            className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                        >
                            <th className="py-2 w-[4%]">{index + 1}</th>
                            <td className="py-2 w-[12%]">
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {item.name}
                                </a>
                            </td>

                            <td className="py-2 w-[24%]">
                                <div className="max-h-[100px] overflow-y-auto whitespace-pre-line">
                                    {item.business_description}
                                </div>
                            </td>
                            <td className="py-2 w-[30%]">
                                <div className="max-h-[100px] overflow-y-auto space-y-2">
                                    {item.specialized_services?.length > 0 &&
                                        (Array.isArray(item.specialized_services)
                                            ? item.specialized_services
                                            : JSON.parse(item.specialized_services)
                                        ).map((service, i) => (
                                            <div key={i} className="mb-1">
                                                <strong>{service.title}</strong>
                                                {service.price && (
                                                    <span className="text-gray-500 ml-2">({service.price})</span>
                                                )}
                                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{service.description}</div>
                                            </div>
                                        ))}
                                </div>
                            </td>
                            <td className="py-2 w-[30%]">
                                <div className="max-h-[100px] overflow-y-auto space-y-2">
                                    {item.featured_work?.length > 0 &&
                                        (Array.isArray(item.featured_work)
                                            ? item.featured_work
                                            : JSON.parse(item.featured_work)
                                        ).map((work, i) => (
                                            <div key={i}>
                                                <a
                                                    href={work.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline font-medium"
                                                >
                                                    {work.title}
                                                </a>
                                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{work.description}</div>
                                            </div>
                                        ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <th>#</th>
                        <th>Partner Name</th>
                        <th>Business Description</th>
                        <th>Specialized Services</th>
                        <th>Featured Work</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default ShopifyTable;
