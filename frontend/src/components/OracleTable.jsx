import React from "react";

const OracleTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="overflow-x-auto px-4 mt-6">
            <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
                <thead className="bg-base-200 text-base font-semibold">
                    <tr>
                        <th>#</th>
                        <th>Partner Name</th>
                        <th>Expertise Areas</th>
                        <th>Company Overview</th>
                        <th>Solutions</th>
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
                            <td className="py-2">
                                <div className="max-h-[100px] overflow-y-auto">{item.oracle_expertise_areas}</div>
                            </td>
                            <td className="py-2 w-[16rem]">
                                <div className="max-h-[100px] overflow-y-auto whitespace-pre-line">
                                    {item.company_overview}
                                </div>
                            </td>
                            <td className="py-2 w-[24rem]">
                                <div className="max-h-[100px] overflow-y-auto">
                                    {item.solution_titles.split(", ").map((title, i) => (
                                        <div key={i}>
                                            <a
                                                href={item.solution_links.split(", ")[i]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline"
                                            >
                                                {title}
                                            </a>
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
                        <th>Expertise Areas</th>
                        <th>Company Overview</th>
                        <th>Solutions</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default OracleTable;
