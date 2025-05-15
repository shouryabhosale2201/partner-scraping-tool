import React, { useState, useMemo } from 'react';

const NetsuiteTable = ({ data }) => {
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [partnersPerPage, setPartnersPerPage] = useState(100);

  const processedData = useMemo(() => {
    return data.map(partner => ({
      name: partner.name || '-',
      link: partner.link || '',
      region: partner.region || '-',
    }));
  }, [data]);

  const searchFilteredData = useMemo(() =>
    processedData.filter(p => p.name.toLowerCase().includes(tableSearchTerm.toLowerCase())),
    [processedData, tableSearchTerm]
  );

  const totalPages = Math.ceil(searchFilteredData.length / partnersPerPage);
  const startIndex = (currentPage - 1) * partnersPerPage;
  const pageRows = searchFilteredData.slice(startIndex, startIndex + partnersPerPage);

  const handlePartnerClick = link => link && window.open(link, '_blank', 'noopener,noreferrer');

  return (
    <div className="flex flex-col h-screen overflow-hidden pt-4">
      <div className="sticky top-0 z-30 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Search by name"
            value={tableSearchTerm}
            onChange={e => {
              setTableSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex items-center space-x-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600">Show:</label>
            <select
              id="pageSize"
              value={partnersPerPage}
              onChange={e => {
                setPartnersPerPage(+e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Showing {pageRows.length ? startIndex + 1 : 0}–{Math.min(startIndex + partnersPerPage, searchFilteredData.length)} of {searchFilteredData.length} partners
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-base-200 text-base font-semibold bg-gray-100">
            <tr>
              <th className="w-8 py-2">#</th>
              <th className="w-64 text-left px-2 py-2">Partner Name</th>
              <th className="w-[300px] text-left px-2 py-2">Link</th>
              <th className="w-[200px] text-left px-2 py-2">Region</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((partner, idx) => (
              <tr key={idx}
                  onClick={() => handlePartnerClick(partner.link)}
                  className="align-top text-sm text-gray-700 border-b border-gray-300 h-16 last:border-b-0 hover:bg-gray-50 transition cursor-pointer">
                <td className="px-7 py-2">{startIndex + idx + 1}</td>
                <td className="px-2 py-2 truncate">{partner.name}</td>
                <td className="px-2 py-2 text-blue-500 underline truncate">{partner.link}</td>
                <td className="px-2 py-2">{partner.region}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-sm text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-4 pb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-2 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
          >
            Previous
          </button>
          <div className="flex items-center text-gray-700">Page {currentPage} of {totalPages}</div>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-2 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NetsuiteTable;
