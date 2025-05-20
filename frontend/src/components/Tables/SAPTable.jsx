import React, { useState, useMemo } from 'react';
import SAPSidebar from '../Filter_Sidebars/SAPSidebar';

const SAPTable = ({ data }) => {
  const [selectedFilters, setSelectedFilters] = useState({});
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [partnersPerPage, setPartnersPerPage] = useState(100);

  const processedData = useMemo(() => {
    return data.map(partner => ({
      name: partner.name || '-',
      link: partner.link || '',
      industries: partner.industries || [],
      engagement: partner.engagement || [],
      countries: partner.countries || [],
      solutions: partner.solutions || {},
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    const f = selectedFilters.sapFilters || {};
    const selIndustries = f.industries || [];
    const selEngagement = f.engagement || [];
    const selCountries = f.countries || [];
    const selSolutions = f.solutions || [];

    return processedData.filter(p => {
      const matchIndustries = selIndustries.length === 0 || selIndustries.every(i => p.industries.includes(i));
      const matchEngagement = selEngagement.length === 0 || selEngagement.every(e => p.engagement.includes(e));
      const matchCountries = selCountries.length === 0 || selCountries.every(c => p.countries.includes(c));

      // Flatten solutionL2 values
      const solutionL2s = Object.values(p.solutions).flat();
      const matchSolutions = selSolutions.length === 0 || selSolutions.every(s => solutionL2s.includes(s));

      return matchIndustries && matchEngagement && matchCountries && matchSolutions;
    });
  }, [processedData, selectedFilters]);

  const searchFilteredData = useMemo(() =>
    filteredData.filter(p => p.name.toLowerCase().includes(tableSearchTerm.toLowerCase())),
    [filteredData, tableSearchTerm]
  );

  const totalPages = Math.ceil(searchFilteredData.length / partnersPerPage);
  const startIndex = (currentPage - 1) * partnersPerPage;
  const pageRows = searchFilteredData.slice(startIndex, startIndex + partnersPerPage);

  const renderCell = val => Array.isArray(val) ? val.join(', ') || '-' : val || '-';

  const renderSolutionsCell = solutionsObj => {
    const allSolutions = Object.values(solutionsObj).flat();
    return allSolutions.length ? allSolutions.join(', ') : '-';
  };

  const handlePartnerClick = link => link && window.open(link, '_blank', 'noopener,noreferrer');

  return (
    <div className="flex h-screen overflow-hidden pt-4">
      <SAPSidebar
        data={processedData}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onFilterChange={f => {
          setSelectedFilters(f);
          setCurrentPage(1);
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
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
                <th className="w-12 px-2 py-2">#</th>
                <th className="w-64 text-left px-2 py-2">Partner Name</th>
                <th className="w-[300px] text-left px-2 py-2">Industries</th>
                <th className="w-[300px] text-left px-2 py-2">Engagements</th>
                <th className="w-[400px] text-left px-2 py-2">Solutions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((partner, idx) => (
                <tr key={idx}
                    onClick={() => handlePartnerClick(partner.link)}
                    className="align-top text-sm text-gray-700 border-b border-gray-300 h-30 last:border-b-0 hover:bg-gray-50 transition cursor-pointer">
                  <td className="px-4 py-2 h-30 flex items-center">{startIndex + idx + 1}</td>
                  <td className="px-2 py-2 text-blue-500 hover:underline h-30">
                    <div className="h-full flex items-center overflow-hidden">
                      <div className="truncate">{partner.name}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2 h-30">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <div className="py-2">{renderCell(partner.industries)}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2 h-30">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <div className="py-2">{renderCell(partner.engagement)}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2 h-30">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <div className="py-2">{renderSolutionsCell(partner.solutions)}</div>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-sm text-gray-500">
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
    </div>
  );
};

export default SAPTable;