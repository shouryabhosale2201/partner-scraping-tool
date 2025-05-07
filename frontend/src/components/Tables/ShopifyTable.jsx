 //shopifyTable.jsx
 import React, { useState, useMemo, useEffect } from 'react';

 const ShopifySidebar = ({ data, selectedFilters, setSelectedFilters, onFilterChange }) => {
     const [searchTerm, setSearchTerm] = useState('');
     const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
     const [isIndustriesOpen, setIsIndustriesOpen] = useState(false);
     const [isLocationsOpen, setIsLocationsOpen] = useState(false);

    /* ───────────── derive unique filter lists ───────────── */
    const uniqueLanguages = useMemo(() => {
        const langs = new Set();
        data.forEach(item => item.languages?.forEach(lang => {
            if (lang && lang !== 'N/A') langs.add(lang.trim());
        }));
        return [...langs].sort();
    }, [data]);

    const uniqueIndustries = useMemo(() => {
        const inds = new Set();
        data.forEach(item => {
            if (item.industries && item.industries !== 'N/A') {
                const arr = Array.isArray(item.industries)
                    ? item.industries
                    : item.industries.split(',');
                arr.forEach(i => i && inds.add(i.trim()));
            }
        });
        return [...inds].sort();
    }, [data]);

    const uniqueLocations = useMemo(() => {
        const countries = new Set();
        data.forEach(item => {
            const locArr = Array.isArray(item.locations)
                ? item.locations
                : (typeof item.locations === 'string' ? [item.locations] : []);
            locArr.forEach(loc => {
                if (loc && loc !== 'N/A') {
                    const parts = loc.split(',');
                    const country = parts[parts.length - 1]?.trim();
                    if (country) countries.add(country);
                }
            });
        });
        return [...countries].sort();
    }, [data]);

    /* ───────────── generic toggle handler ───────────── */
    const handleFilterToggle = (filterType, filterName) => {
        const updated = { ...selectedFilters };
        const key = 'shopifyFilters';
        if (!updated[key]) updated[key] = {};
        if (!updated[key][filterType]) updated[key][filterType] = [];

        if (updated[key][filterType].includes(filterName)) {
            updated[key][filterType] = updated[key][filterType].filter(f => f !== filterName);
        } else {
            updated[key][filterType].push(filterName);
        }
        setSelectedFilters(updated);
        onFilterChange(updated);
    };

    /* ───────────── reusable UI section ───────────── */
    const renderFilterSection = (title, filters, filterType, isOpen, setIsOpen) => {
        const filtered = filters.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
        const hasResults = filtered.length > 0;
        return (
            <div className="mb-6">
                <button onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex justify-between items-center bg-gray-200 px-4 py-2 text-md font-bold rounded hover:bg-gray-200">
                    <span>{title}</span>
                    <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>

                {searchTerm && !isOpen && hasResults && setIsOpen(true)}

                {isOpen && (
                    <div className="flex flex-col gap-2 mt-2 ml-2 max-h-64 overflow-y-auto">
                        {hasResults ? (
                            filtered.map((filter, idx) => (
                                <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox"
                                           value={filter}
                                           checked={selectedFilters['shopifyFilters']?.[filterType]?.includes(filter) || false}
                                           onChange={() => handleFilterToggle(filterType, filter)}
                                           className="checkbox checkbox-sm"/>
                                    <span>{filter}</span>
                                </label>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500">No matches found.</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /* ───────────── sidebar JSX ───────────── */
    return (
        <div className="w-1/4 min-w-[300px] border-r bg-gray-100 border-gray-200 shadow-md p-4 h-screen flex flex-col">
            <div className="sticky top-0 z-10 bg-gray-100 pb-4">
                <div className="mb-4">
                    <input type="text" placeholder="Search filters" value={searchTerm}
                           onChange={e => {
                               setSearchTerm(e.target.value);
                               if (e.target.value) {
                                   if (uniqueLanguages.some(l => l.toLowerCase().includes(e.target.value.toLowerCase()))) setIsLanguagesOpen(true);
                                   if (uniqueIndustries.some(i => i.toLowerCase().includes(e.target.value.toLowerCase()))) setIsIndustriesOpen(true);
                                   if (uniqueLocations.some(c => c.toLowerCase().includes(e.target.value.toLowerCase()))) setIsLocationsOpen(true);
                               }
                           }}
                           className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="mb-4">
                    <button onClick={() => {
                                setSelectedFilters({});
                                onFilterChange({});
                                setSearchTerm('');
                                setIsLanguagesOpen(false); setIsIndustriesOpen(false); setIsLocationsOpen(false);
                            }}
                            className="w-24 h-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 hover:bg-gray-600 bg-orange-500 text-white text-sm">Reset</button>
                </div>
                <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
                <div className="border-b border-gray-300 mb-4"/>
            </div>
            <div className="flex-1 overflow-y-auto pl-2">
                {renderFilterSection('Languages',  uniqueLanguages,  'languages',  isLanguagesOpen,  setIsLanguagesOpen)}
                {renderFilterSection('Industries', uniqueIndustries, 'industries', isIndustriesOpen, setIsIndustriesOpen)}
                {renderFilterSection('Countries',  uniqueLocations,  'locations',  isLocationsOpen,  setIsLocationsOpen)}
            </div>
        </div>
    );
};

/* ═════════════════════ TABLE ═════════════════════ */
const ShopifyTable = ({ data }) => {
    const [selectedFilters, setSelectedFilters] = useState({});
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [partnersPerPage, setPartnersPerPage] = useState(200);

    /* restore filters from localStorage */
    useEffect(() => {
        const stored = localStorage.getItem('shopifyFilters');
        if (stored) setSelectedFilters(JSON.parse(stored));
    }, []);
    useEffect(() => {
        localStorage.setItem('shopifyFilters', JSON.stringify(selectedFilters));
    }, [selectedFilters]);

    /* ───────────── helper to normalise raw API/string rows ───────────── */
    const processSinglePartnerString = partnerString => {
        try {
            const parts = partnerString.split(/(?<!\/)⭐\s/);
            const nameAndRest = parts[0]?.trim().split(/( - )(.+)/s) || [partnerString.trim()];
            const name = nameAndRest[0]?.trim();
            const rest = nameAndRest[2]?.trim();
            const locAndRest = rest?.split(/(?<!\w),\s(?!\w)/) || [];
            const location = locAndRest[0]?.trim().split(',').map(l => l.trim());
            const langAndInd = locAndRest.slice(1).join(',').split(/(?<!\w),\s(?!\w)/).map(s => s.trim());
            let languages = [], industries = [], foundInd = false;
            for (const item of langAndInd) {
                if (foundInd || item.includes('and')) { industries.push(item); foundInd = true; }
                else { languages.push(item); }
            }
            return {
                name: name || partnerString.trim(),
                locations: location.filter(Boolean),
                languages: languages.filter(Boolean),
                industries: industries.filter(Boolean).join(', '),
                link: ''
            };
        } catch (err) {
            console.error('Error processing partner string:', partnerString, err);
            return { name: partnerString.trim(), locations: [], languages: [], industries: '', link: '' };
        }
    };

    /* ───────────── normalise all rows ───────────── */
    const normalizedData = useMemo(() => {
        return data.map(item => {
            if (typeof item === 'string') return processSinglePartnerString(item);
            return {
                name: item.name || '',
                locations: Array.isArray(item.locations)
                    ? item.locations.map(l => l.trim())
                    : (typeof item.locations === 'string' ? [item.locations.trim()] : []),
                languages: Array.isArray(item.languages)
                    ? item.languages.map(l => l.trim())
                    : (typeof item.languages === 'string' ? item.languages.split(',').map(l => l.trim()) : []),
                industries: typeof item.industries === 'string'
                    ? item.industries.split(',').map(i => i.trim()).join(', ')
                    : (Array.isArray(item.industries) ? item.industries.map(i => i.trim()).join(', ') : ''),
                link: item.link || ''    // <-- keep URL so clicking works
            };
        });
    }, [data]);

    /* ───────────── filter by sidebar selections ───────────── */
    const filteredData = useMemo(() => {
        const f = selectedFilters.shopifyFilters || {};
        const selLang = f.languages || [];
        const selInd  = f.industries || [];
        const selLoc  = f.locations || [];
        return normalizedData.filter(row => {
            const matchLang = selLang.length === 0 || selLang.every(l => row.languages.includes(l));
            const matchInd  = selInd.length === 0 || selInd.every(i => row.industries.split(',').map(p => p.trim()).includes(i));
            const matchLoc  = selLoc.length === 0 || selLoc.every(c => row.locations.some(loc => loc.split(',').pop().trim() === c));
            return matchLang && matchInd && matchLoc;
        });
    }, [normalizedData, selectedFilters]);

    /* table search */
    const searchFilteredData = useMemo(() => filteredData.filter(r => r.name.toLowerCase().includes(tableSearchTerm.toLowerCase())), [filteredData, tableSearchTerm]);

    /* pagination */
    const totalPages  = Math.ceil(searchFilteredData.length / partnersPerPage) || 1;
    const startIndex  = (currentPage - 1) * partnersPerPage;
    const pageRows    = searchFilteredData.slice(startIndex, startIndex + partnersPerPage);

    const handlePartnerClick = link => window.open(link, '_blank', 'noopener,noreferrer');

    const renderCell = val => {
        if (Array.isArray(val)) return val.filter(v => v && v !== 'N/A').join(', ') || '-';
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean).join(', ') || '-';
        return val && val !== 'N/A' ? String(val).trim() : '-';
    };

     if (!data || data.length === 0) return null;

    return (
        <div className="flex h-screen pt-4">
            <ShopifySidebar data={normalizedData}
                            selectedFilters={selectedFilters}
                            setSelectedFilters={setSelectedFilters}
                            onFilterChange={f => { setSelectedFilters(f); setCurrentPage(1); }} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
                    <div className="flex items-center justify-between">
                        <input type="text" placeholder="Search in table" value={tableSearchTerm}
                               onChange={e => { setTableSearchTerm(e.target.value); setCurrentPage(1); }}
                               className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <div className="flex items-center">
                            <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">Show:</label>
                            <select id="pageSize" value={partnersPerPage} onChange={e => { setPartnersPerPage(+e.target.value); setCurrentPage(1); }}
                                    className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                <option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Showing {pageRows.length ? startIndex + 1 : 0}-{Math.min(startIndex + partnersPerPage, searchFilteredData.length)} of {searchFilteredData.length} partners
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6">
                    {/* <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed"> */}
                    <table className={`table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed
                    ${pageRows.length === 0 ? 'max-h-[220px]' : ''}`}>
                        <thead className="sticky z-10 bg-base-200 text-base font-semibold">
                            <tr>
                                <th className="w-12 px-4 py-2">#</th>
                                <th className="w-64 text-left px-4 py-2">Partner Name</th>
                                <th className="w-48 text-left px-4 py-2">Location</th>
                                <th className="w-48 text-left px-4 py-2">Languages</th>
                                <th className="w-[300px] text-left px-4 py-2">Industries</th>
                            </tr>
                        </thead>
                        {/* <tbody>
                            {pageRows.map((row, idx) => (
                                <tr key={idx}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => row.link && handlePartnerClick(row.link)}>
                                    <th className="py-2 px-4">{startIndex + idx + 1}</th>
                                    <td className="py-2 break-words text-blue-500 hover:underline px-4">{row.name}</td>
                                    <td className="py-2 px-4">{renderCell(row.locations)}</td>
                                    <td className="py-2 px-4">{renderCell(row.languages)}</td>
                                    <td className="py-2 px-4">{renderCell(row.industries)}</td>
                                </tr>
                            ))}
                        </tbody> */}
                        <tbody>
                            {pageRows.length > 0 ? (
                                /* normal rows */
                                pageRows.map((row, idx) => (
                                <tr
                                    key={idx}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => row.link && handlePartnerClick(row.link)}
                                >
                                    <th className="py-2 px-4">{startIndex + idx + 1}</th>
                                    <td className="py-2 break-words text-blue-500 hover:underline px-4">{row.name}</td>
                                    <td className="py-2 px-4">{renderCell(row.locations)}</td>
                                    <td className="py-2 px-4">{renderCell(row.languages)}</td>
                                    <td className="py-2 px-4">{renderCell(row.industries)}</td>
                                </tr>
                                ))
                            ) : (
                                /* empty state */
                                <tr>
                                <td colSpan={5} className="py-10">
                                    <div className="flex flex-col items-center text-gray-500">
                                    {/* binocular icon */}
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="1.5">
                                        <path d="M7 4h2l1 5m6-5h2l-1 5M5 13v4a3 3 0 003 3h0a3 3 0 003-3v-4M13 13v4a3 3 0 003 3h0a3 3 0 003-3v-4M9 13h6M9 9h6"/>
                                    </svg>
                                    <span className="mt-3 text-base font-medium">
                                        No partners found&nbsp;… try different filters
                                    </span>
                                    </div>
                                </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                    {/* pagination controls */}
                    <div className="mt-4 flex justify-center space-x-4">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>Previous</button>
                        <div className="flex items-center text-gray-700">Page {currentPage} of {totalPages}</div>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages || searchFilteredData.length <= partnersPerPage}
                                className={`px-4 py-2 rounded ${(currentPage === totalPages || searchFilteredData.length <= partnersPerPage) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

 export default ShopifyTable;

