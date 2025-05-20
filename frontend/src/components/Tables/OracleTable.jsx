import React, { useState, useMemo } from "react";
import OracleSidebar from "../Filter_Sidebars/OracleSidebar";

const OracleTable = ({ data }) => {
    const [selectedFilters, setSelectedFilters] = useState({});
    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [partnersPerPage, setPartnersPerPage] = useState(200);

    const handleFilterChange = (newFilters) => {
        setSelectedFilters(newFilters);
        setCurrentPage(1);
    };

    const filteredData = useMemo(() => {
        const selected = selectedFilters.oracleFilters || [];
        if (selected.length === 0) return data;

        const selectedExpertise = [];
        const selectedLocations = [];

        // separate selected filters into expertise and locations
        selected.forEach(item => {
            if (data.some(partner => partner.filters?.some(f => f.level4Name === item))) {
                selectedExpertise.push(item);
            }
            if (data.some(partner => partner.locations?.includes(item))) {
                selectedLocations.push(item);
            }
        });

        return data.filter(partner => {
            const expertiseMatch = selectedExpertise.length === 0 || partner.filters?.some(f => selectedExpertise.includes(f.level4Name));
            const locationMatch = selectedLocations.length === 0 || selectedLocations.some(loc => partner.locations?.includes(loc));

            // require both expertise AND location criteria
            return expertiseMatch && locationMatch;
        });
    }, [data, selectedFilters]);

    const searchFilteredData = useMemo(() =>
        filteredData.filter(p => p.name.toLowerCase().includes(tableSearchTerm.toLowerCase())),
        [filteredData, tableSearchTerm]
    );

    const totalPages = Math.ceil(searchFilteredData.length / partnersPerPage);
    const startIndex = (currentPage - 1) * partnersPerPage;
    const pageRows = searchFilteredData.slice(startIndex, startIndex + partnersPerPage);

    return (
        <div className="flex h-screen pt-4">
            <OracleSidebar
                data={data}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                onFilterChange={handleFilterChange}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            placeholder="Search in table"
                            value={tableSearchTerm}
                            onChange={e => { setTableSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center">
                            <label className="mr-2 text-sm text-gray-600">Show:</label>
                            <select
                                value={partnersPerPage}
                                onChange={e => { setPartnersPerPage(+e.target.value); setCurrentPage(1); }}
                                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-100"
                            >
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Showing {pageRows.length ? startIndex + 1 : 0}-{Math.min(startIndex + partnersPerPage, searchFilteredData.length)} of {searchFilteredData.length} partners
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
                            {pageRows.map((item, idx) => (
                                <tr
                                    key={item.id || item.serialNumber || idx}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                                >
                                    <th className="py-2">{startIndex + idx + 1}</th>
                                    <td className="py-2 truncate">{item.name}</td>
                                    <td className="py-2">
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                            Visit Partner
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 flex justify-center space-x-4">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                        >Previous</button>
                        <div className="flex items-center text-gray-700">Page {currentPage} of {totalPages}</div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                        >Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OracleTable;
