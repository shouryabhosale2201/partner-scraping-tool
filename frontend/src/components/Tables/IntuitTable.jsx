/*  IntuitTable.jsx  – Shopify-style table & clickable partner name
    Sidebar unchanged (Industry/Product/Services/Cities)                  */

import React, { useState, useMemo } from "react";

/* helper: grab the “Who We Are” blurb as plain text */
const whoWeAre = html => {
    if (!html) return "";
    const m = html.match(/<b[^>]*>\s*Who\s+We\s+Are\s*<\/b>([\s\S]*?)(<b|$)/i);
    if (!m) return "";
    return m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

/* ─────────── Sidebar component (unchanged) ─────────── */
const Sidebar = ({ data, selected, setSelected, onChange }) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState({ industries: true, products: true, services: true, locations: true });

    const { inds, prods, servs, locs } = useMemo(() => {
        const ind = new Map(), prod = new Map(), serv = new Map(), loc = new Map();
        const add = (m, v) => v && m.set(v.toLowerCase(), v);
        data.forEach(p => {
            p.filters.forEach(f => {
                if (f.category === "Industry Focus") add(ind, f.name);
                if (f.category === "Product Focus") add(prod, f.name);
                if (f.category === "Specialized Services") add(serv, f.name);
            });
            p.cities.forEach(c => add(loc, c));
        });
        const sort = m => Array.from(m.values()).sort((a, b) => a.localeCompare(b));
        return { inds: sort(ind), prods: sort(prod), servs: sort(serv), locs: sort(loc) };
    }, [data]);

    const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));
    const change = v => {
        const bucket = "intuitFilters";
        const next = { ...selected };
        if (!next[bucket]) next[bucket] = [];
        next[bucket] = next[bucket].includes(v)
            ? next[bucket].filter(x => x !== v)
            : [...next[bucket], v];
        setSelected(next); onChange(next);
    };

    const section = (title, key, list) => {
        const isOpen = open[key];
        const shown = list.filter(v => !search || v.toLowerCase().includes(search.toLowerCase()));
        return (
            <div className="mb-6">
                <button onClick={() => toggle(key)}
                    className="w-full flex justify-between bg-gray-200 px-4 py-2 font-bold rounded">
                    <span>{title}</span>
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isOpen && (
                    <div className="ml-2 mt-2 max-h-64 overflow-y-auto flex flex-col gap-2">
                        {shown.length ? shown.map(v => (
                            <label key={v} className="flex items-center space-x-2 text-xs">
                                <input type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={selected["intuitFilters"]?.includes(v) || false}
                                    onChange={() => change(v)} />
                                <span>{v}</span>
                            </label>
                        )) : <span className="text-gray-500 text-sm">No matches found</span>}
                    </div>
                )}
            </div>
        );
    };

    const reset = () => { setSelected({}); onChange({}); setSearch(""); };

    return (
        <div className="w-1/4 min-w-[300px] border-r bg-gray-100 p-4 h-screen sticky top-0 overflow-y-auto shadow-md">
            <div className="sticky top-0 bg-gray-100 pb-4">
                <input className="w-full border rounded-md p-2 mb-3"
                    placeholder="Search filters"
                    value={search}
                    onChange={e => setSearch(e.target.value)} />
                <button onClick={reset}
                    className="w-24 h-8 bg-orange-500 text-white rounded-md mb-4 text-sm">Reset</button>
                <h2 className="text-lg font-semibold mb-2">Apply Filters</h2>
                <div className="border-b mb-2"></div>
            </div>
            {section("Industry Focus", "industries", inds)}
            {section("Product Focus", "products", prods)}
            {section("Specialized Services", "services", servs)}
            {section("Cities", "locations", locs)}
        </div>
    );
};

/* ─────────── Main Table component ─────────── */
export default function IntuitTable({ data }) {
    const [filters, setFilters] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [per, setPer] = useState(200);

    /* flatten once */
    const rows = useMemo(() => data.map((p, i) => {
        const fl = [];
        p.fieldValues?.forEach(fv => {
            if (["Industry Focus", "Product Focus", "Specialized Services"].includes(fv.displayName))
                fv.values?.forEach(v => fl.push({ category: fv.displayName, name: v }));
        });
        const cities = p.addresses?.map(a => a.city?.toUpperCase()).filter(Boolean) || [];
        return {
            serial: i + 1,
            name: p.name,
            link: p.website || "",
            desc: whoWeAre(p.profileDescription || p.description || ""),
            filters: fl,
            cities
        };
    }), [data]);

    /* sidebar filter logic */
    const afterSidebar = useMemo(() => {
        const want = filters["intuitFilters"] || [];
        if (!want.length) return rows;
        const wantCat = cat => want.filter(v => rows.some(r => r.filters.some(f => f.category === cat && f.name === v)));
        const wantCity = want.filter(v => rows.some(r => r.cities.includes(v)));
        return rows.filter(r => {
            const all = (cat) => wantCat(cat).every(v => r.filters.some(f => f.category === cat && f.name === v));
            return all("Industry Focus") && all("Product Focus") && all("Specialized Services") &&
                wantCity.every(v => r.cities.includes(v));
        });
    }, [rows, filters]);

    /* table search */
    const searched = useMemo(() => {
        if (!search) return afterSidebar;
        const t = search.toLowerCase();
        return afterSidebar.filter(r => r.name.toLowerCase().includes(t) || r.cities.some(c => c.toLowerCase().includes(t)));
    }, [afterSidebar, search]);

    /* pagination */
    const pages = Math.ceil(searched.length / per) || 1;
    const slice = searched.slice((page - 1) * per, page * per);

    return (
        <div className="flex h-screen pt-4">
            <Sidebar data={rows} selected={filters} setSelected={setFilters} onChange={() => setPage(1)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* top bar like Shopify */}
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-4 border-b border-gray-300">
                    <div className="flex items-center justify-between">
                        <input className="w-1/3 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Search in table"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        <div className="flex items-center">
                            <label className="mr-2 text-sm text-gray-600">Show:</label>
                            <select value={per}
                                onChange={e => { setPer(+e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-md p-2 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                <option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Showing {slice.length ? (page - 1) * per + 1 : 0}-{Math.min(page * per, searched.length)} of {searched.length} partners
                    </div>
                </div>

                {/* table styled like Shopify */}
                <div className="flex-1 overflow-y-auto pb-6">
                    <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full table-fixed">
                        <thead className="sticky z-10 bg-base-200 text-base font-semibold">
                            <tr>
                                <th className="w-12 px-4 py-2">#</th>
                                <th className="w-64 text-left px-4 py-2">Partner Name</th>
                                <th className="w-48 text-left px-4 py-2">City</th>
                                <th className="text-left px-4 py-2">Description&nbsp;(Who&nbsp;We&nbsp;Are)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slice.map((r, idx) => (
                                <tr key={r.serial}
                                    className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition">
                                    <th className="py-2 px-4">{(page - 1) * per + idx + 1}</th>
                                    <td className="py-2 break-words px-4">
                                        {r.link
                                            ? <a href={r.link} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline">{r.name}</a>
                                            : r.name}
                                    </td>
                                    <td className="py-2 px-4">{r.cities[0] || '-'}</td>
                                    <td
                                        className="py-2 px-4 max-w-[32rem] break-words whitespace-pre-line"
                                        title={r.desc}
                                    >
                                        {r.desc || "—"}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* pagination controls identical to Shopify’s */}
                    <div className="mt-4 flex justify-center space-x-4">
                        <button onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className={`px-4 py-2 rounded ${page === 1
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'}`}>Previous</button>
                        <div className="flex items-center text-gray-700">Page {page} of {pages}</div>
                        <button onClick={() => setPage(p => Math.min(p + 1, pages))}
                            disabled={page === pages}
                            className={`px-4 py-2 rounded ${page === pages
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'}`}>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
