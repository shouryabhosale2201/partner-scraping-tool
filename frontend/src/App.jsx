import { useState, useRef, useEffect } from "react";
import axios from "axios";
import SalesforceTable from "./components/Tables/SalesforceTable";
import SalesforceFieldSelector from "./components/Field_Selectors/SalesforceFieldSelector";
import OracleTable from "./components/Tables/OracleTable";
import ShopifyTable from "./components/Tables/ShopifyTable";
import MicrosoftTable from "./components/Tables/MicrosoftTable";
import SAPTable from "./components/Tables/SAPTable";
import NetsuiteTable from "./components/Tables/NetsuiteTable";
import IntuitTable from "./components/Tables/IntuitTable";
import ProductInfo from "./components/ProductInfo";
import MicrosoftFieldSelection from "./components/Field_Selectors/MicorsoftFieldSelection";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [scrapingPlatform, setScrapingPlatform] = useState(null);

  const [fetching, setFetching] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState(null);
  // For Microsoft - object-based field selection
  const [microsoftFields, setMicrosoftFields] = useState({});
  // For Salesforce - array-based field selection
  const [salesforceFields, setSalesforceFields] = useState([]);
  const [pendingSalesforceFields, setPendingSalesforceFields] = useState([]);
  const tableRef = useRef(null);
  const [lastScrapedAt, setLastScrapedAt] = useState(null);

  useEffect(() => {
    if (url) {
      const savedTime = localStorage.getItem(`${url}_lastScrapedAt`);
      if (savedTime) {
        setLastScrapedAt(savedTime);
      } else {
        setLastScrapedAt(null);
      }
    }
  }, [url]);


  useEffect(() => {
    if (data.length > 0 && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data, url]);

  // Update pendingFields from Salesforce field selector
  const handlePendingSalesforceFieldsChange = (fields) => {
    setPendingSalesforceFields(fields);
  };

  // Update Microsoft field selection
  const handleMicrosoftFieldsChange = (fields) => {
    setMicrosoftFields(fields);
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setData([]);

    // Reset selected fields when changing platform
    if (newUrl === "microsoft") {
      setMicrosoftFields({});
    }
    if (newUrl === "salesforce") {
      setSalesforceFields([]);
      setPendingSalesforceFields([]);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapingPlatform(url); // Lock in the current platform being scraped
    setError(null);
    setData([]);
    try {
      // For Microsoft, pass selected fields as query params
      if (url === "microsoft") {
        const fieldsToScrape = Object.keys(microsoftFields).filter(key => microsoftFields[key]);
        const response = await axios.get(
          `http://localhost:5000/api/v1/${url}/scrape`,
          { params: { fields: JSON.stringify(fieldsToScrape) } }
        );
        if (response.data.success) {
          setData(response.data.data);
          const now = new Date().toISOString();
          localStorage.setItem(`${url}_lastScrapedAt`, now);
          setLastScrapedAt(now);
        }
        else throw new Error(response.data.error);
      } else if (url === "salesforce") {
        // For Salesforce, use pendingSalesforceFields (not salesforceFields)
        // Also update salesforceFields to keep them in sync
        setSalesforceFields(pendingSalesforceFields);

        const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`, {
          params: { fields: JSON.stringify(pendingSalesforceFields) }
        });
        if (response.data.success) {
          setData(response.data.data);
          const now = new Date().toISOString();
          localStorage.setItem(`${url}_lastScrapedAt`, now);
          setLastScrapedAt(now);
        }
        else throw new Error(response.data.error);
      } else {
        // For other platforms, use the basic approach
        const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`);
        if (response.data.success) {
          setData(response.data.data);
          const now = new Date().toISOString();
          localStorage.setItem(`${url}_lastScrapedAt`, now);
          setLastScrapedAt(now);
        }
        else throw new Error(response.data.error);
      }
    } catch (err) {
      setError(err.message);
    }
    setScraping(false);
    setScrapingPlatform(null); // Clear once done
  };

  const handleFetch = async (selectedFilters = {}) => {
    setFetching(true);
    setError(null);

    try {
      // Construct file path based on url variable
      const filePath = `/data/${url}-partners.json`;
      console.log(`Fetching from local file: ${filePath}`);

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${filePath}`);
      }

      const jsonData = await response.json();
      let filteredData = [...jsonData]; // Create a copy to avoid mutation issues

      // MICROSOFT DATA HANDLING
      if (url === "microsoft") {
        // Helper function to apply filters with EVERY logic (matches server implementation)
        const applyFilter = (field, selectedValues) => {
          if (!selectedValues || selectedValues.length === 0) return;
          filteredData = filteredData.filter(item => {
            const itemField = item[field] || [];
            return selectedValues.some(val => itemField.includes(val));
          });
        };

        // Apply each filter using the helper function - this matches the server implementation
        if (selectedFilters.industry?.length > 0) {
          applyFilter('industryFocus', selectedFilters.industry);
        }

        if (selectedFilters.product?.length > 0) {
          applyFilter('product', selectedFilters.product);
        }

        if (selectedFilters.solution?.length > 0) {
          applyFilter('solutions', selectedFilters.solution);
        }

        if (selectedFilters.services?.length > 0) {
          applyFilter('serviceType', selectedFilters.services);
        }

        if (selectedFilters.country?.length > 0) {
          applyFilter('country', selectedFilters.country);
        }

        // Get selected fields
        const selectedFieldKeys = Object.keys(microsoftFields).filter(key => microsoftFields[key]);

        // Apply field selection (matches server implementation)
        if (selectedFieldKeys && selectedFieldKeys.length > 0) {
          filteredData = filteredData.map(item => {
            // Always include these core fields
            const newItem = {
              id: item.id,
              name: item.name || '',
              link: item.link || ''
            };

            // Add selected fields
            selectedFieldKeys.forEach(field => {
              if (item[field] !== undefined) {
                newItem[field] = item[field];
              }
            });

            return newItem;
          });
        }
      }

      // SALESFORCE DATA HANDLING
      else if (url === "salesforce") {
        // Update the Salesforce fields in state
        setSalesforceFields(pendingSalesforceFields);

        // Extract filters
        const salesforceExpertise = selectedFilters.salesforceExpertise || [];
        const industryExpertise = selectedFilters.industryExpertise || [];
        const regionFilters = selectedFilters.region || [];
        const countryFilters = selectedFilters.country || [];

        // Helper function to match expertise filters - matches server implementation
        const matchesFilters = (foundIn, section, filters) => {
          if (!filters || filters.length === 0) return true;
          const entry = foundIn?.find(f => f.section === section);
          if (!entry) return false;
          return filters.every(f => entry.filters.includes(f));
        };

        // Filter partners based on all conditions (AND logic)
        filteredData = filteredData.filter(partner => {
          const foundIn = partner.foundIn || [];
          const countries = partner.countries || {};

          // Check Salesforce Expertise
          const matchesSalesforce = salesforceExpertise.length === 0 ||
            matchesFilters(foundIn, "Salesforce Expertise", salesforceExpertise);

          // Check Industry Expertise
          const matchesIndustry = industryExpertise.length === 0 ||
            matchesFilters(foundIn, "Industry Expertise", industryExpertise);

          // Region filtering - use Every logic as per server
          let matchesRegions = true;
          if (regionFilters.length > 0) {
            const allRegions = Object.values(countries).flat(); // Get all regions regardless of country
            matchesRegions = regionFilters.every(region => allRegions.includes(region));
          }

          // Country filtering
          let matchesCountries = true;
          if (countryFilters.length > 0) {
            matchesCountries = countryFilters.some(country =>
              Object.keys(countries).includes(country)
            );
          }

          // Apply AND logic to all filter categories
          return matchesSalesforce && matchesIndustry && matchesRegions && matchesCountries;
        });

        // Apply field selection
        if (pendingSalesforceFields.length > 0) {
          filteredData = filteredData.map(partner => {
            const partial = {
              // Always include these core fields
              id: partner.id || '',
              name: partner.name || '',
              link: partner.link || ''
            };

            // Add selected fields
            pendingSalesforceFields.forEach(field => {
              if (partner[field] !== undefined) {
                partial[field] = partner[field];
              }
            });

            return partial;
          });
        } else {
          // If no specific fields are selected, return only id, name and link
          filteredData = filteredData.map(partner => ({
            id: partner.id || '',
            name: partner.name || '',
            link: partner.link || ''
          }));
        }
      }

      console.log(`Filtered data count: ${filteredData.length}`);
      setData(filteredData);

    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setFetching(false);
    }
  };


  const handleSalesforceFilterChange = (selectedFilters) => {
    if (url === 'salesforce') {
      handleFetch(selectedFilters);
    }
  };

  const handleMicrosoftFilterChange = (selectedFilters) => {
    if (url === 'microsoft') {
      handleFetch(selectedFilters);
    }
  };

  // The updated download Excel function - now independent from fetch
  // const handleDownloadExcel = async () => {
  //   try {
  //     setDownloading(true);

  //     // Create endpoint with appropriate parameters
  //     let endpoint = `http://localhost:5000/api/v1/${url}/downloadExcel`;
  //     const params = new URLSearchParams();

  //     // Set the appropriate fields parameter based on platform
  //     if (url === "microsoft") {
  //       const fieldsToExport = Object.keys(microsoftFields).filter(k => microsoftFields[k]);
  //       if (fieldsToExport.length > 0) {
  //         params.append('fields', JSON.stringify(fieldsToExport));
  //       }
  //     } else if (url === "salesforce") {
  //       // Use the current state of salesforceFields
  //       if (pendingSalesforceFields.length > 0) {
  //         params.append('fields', JSON.stringify(pendingSalesforceFields));
  //       }
  //     }

  //     if (params.toString()) {
  //       endpoint += `?${params.toString()}`;
  //     }

  //     const response = await axios.get(endpoint, {
  //       responseType: "blob"
  //     });

  //     const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
  //     const a = document.createElement("a");
  //     a.href = downloadUrl;
  //     a.download = `${url}_partners.xlsx`;

  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();

  //     window.URL.revokeObjectURL(downloadUrl);

  //     setDownloading(false);
  //   } catch (error) {
  //     console.error("Download failed:", error.message);
  //     alert("Failed to download Excel file. Please try again.");
  //     setDownloading(false);
  //   }
  // };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      // 1. Load the JSON
      const resp = await fetch(`/data/${url}-partners.json`);
      if (!resp.ok) throw new Error(`Failed to fetch ${url}.json: ${resp.statusText}`);
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        alert("No data available to export.");
        setDownloading(false);
        return;
      }
      let processed;
      // 2. Salesforce special case
      if (url === "salesforce") {
        processed = data.map(item => {
          // pull out filters & countries, keep all other fields
          const { foundIn = [], countries = {}, ...rest } = item;
          const out = { ...rest };
          // helper to grab & join filters for a section
          const getFilters = section =>
            (foundIn.find(f => f.section === section)?.filters || []).join(", ");
          // add the two expertise columns
          out["Salesforce Expertise"] = getFilters("Salesforce Expertise");
          out["Industry Expertise"] = getFilters("Industry Expertise");
          // add each countryGroup as its own "X Regions" column
          Object.entries(countries).forEach(([group, regions]) => {
            out[`${group} Regions`] = Array.isArray(regions) ? regions.join(", ") : "";
          });
          // finally, flatten any other arrays just in case
          Object.entries(out).forEach(([k, v]) => {
            if (Array.isArray(v)) out[k] = v.join(", ");
          });
          return out;
        });
        // 3. Default case for everything else
      } else if (url === "oracle") {
        processed = data.map(item => {
          // pull out filters & locations, keep all other fields
          const { filters = [], locations = [], ...rest } = item;
          const out = { ...rest };
          // level4Name entries as a "Filters" column
          out["Filters"] = filters.map(f => f.level4Name).join(", ");
          // join locations into a "Locations" column
          out["Locations"] = Array.isArray(locations) ? locations.join(", ") : "";
          // flatten any other arrays just in case
          Object.entries(out).forEach(([k, v]) => {
            if (Array.isArray(v)) out[k] = v.join(", ");
          });
          return out;
        });
      } else if (url === "intuit") {
        /* helper: extract plain-text “Who We Are” paragraph */
        const whoWeAre = html => {
          const m = html?.match(/<b[^>]*>\s*Who\s+We\s+Are\s*<\/b>([\s\S]*?)(<b|$)/i);
          return m ? m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
        };
        /* helper: grab & join a custom field */
        const grabField = (item, displayName) => {
          const fv = item.fieldValues?.find(f => f.displayName === displayName);
          return fv?.values ? [...new Set(fv.values)].join(", ") : "";
        };

        processed = data.map(item => ({
          id: item.serialNumber || item.id,
          name: item.name || "",
          city: item.addresses?.[0]?.city || "",
          whoWeAre: whoWeAre(item.profileDescription || item.description || ""),
          industryFocus: grabField(item, "Industry Focus"),
          productFocus: grabField(item, "Product Focus"),
          specializedServices: grabField(item, "Specialized Services"),
          website: item.website || ""
        }));

        /* ───── default: flatten any arrays */
      }
      else {
        processed = data.map(row => {
          const out = {};
          Object.entries(row).forEach(([k, v]) => {
            out[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
          });
          return out;
        });
      }
      // 4. Build worksheet
      const worksheet = XLSX.utils.json_to_sheet(processed);
      // 5. Fixed width = 50 for every column
      const headers = Object.keys(processed[0]);
      worksheet["!cols"] = headers.map(() => ({ wch: 50 }));
      // 6. Autofilter over full range
      const lastCol = XLSX.utils.encode_col(headers.length - 1);
      const lastRow = processed.length + 1;
      worksheet["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };
      // 7. Pack workbook & trigger download
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, "Partners");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout]), `${url}_partners.xlsx`);
      setDownloading(false);
    } catch (err) {
      console.error(":x: Excel download failed:", err);
      alert("Failed to generate/download the Excel file.");
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-3xl w-full">
        <ProductInfo />
        <select
          value={url}
          onChange={handleUrlChange}
          className="w-1/2 flex mx-auto p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4 mt-4"
        >
          <option value="">Select a source</option>
          <option value="salesforce">Salesforce</option>
          <option value="oracle">Oracle</option>
          <option value="shopify">Shopify</option>
          <option value="microsoft">Microsoft</option>
          <option value="sap">SAP</option>
          <option value="netsuite">Netsuite</option>
          <option value="intuit">Intuit</option>
        </select>

        {url === "salesforce" && (
          <SalesforceFieldSelector onFieldsChange={handlePendingSalesforceFieldsChange} />
        )}

        {url === "microsoft" && (
          <MicrosoftFieldSelection
            selectedFields={microsoftFields}
            onFieldsChange={handleMicrosoftFieldsChange}
          />
        )}
        {lastScrapedAt && (
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-lg shadow-sm">
              Last scraped on: {new Date(lastScrapedAt).toLocaleString()}
            </div>
          </div>
        )}



        <div className="flex space-x-3 justify-center flex-wrap gap-2">
          <button
            onClick={handleScrape}
            disabled={scraping || !url}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
          >
            Scrape Data
          </button>
          <button
            onClick={() => handleFetch()}
            disabled={!url}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
          >
            Fetch Stored Data
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={!url}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
          >
            Download Excel
          </button>
        </div>
        {(scraping || fetching || downloading) && (
          <p className="text-center mt-4 text-gray-700 font-medium">
            {scraping && `Scraping ${scrapingPlatform?.charAt(0).toUpperCase() + scrapingPlatform?.slice(1)}...`}
          </p>
        )}


        {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
      </div>

      <div ref={tableRef}>
        {data.length > 0 && url === "salesforce" && (
          <SalesforceTable
            data={data}
            selectedFields={salesforceFields}
            onFilterChange={handleSalesforceFilterChange}
          />
        )}
        {data.length > 0 && url === "oracle" && <OracleTable data={data} />}
        {data.length > 0 && url === "shopify" && <ShopifyTable data={data} />}
        {data.length > 0 && url === "sap" && <SAPTable data={data} />}
        {data.length > 0 && url === "netsuite" && <NetsuiteTable data={data} />}
        {data.length > 0 && url === "microsoft" && (
          <MicrosoftTable
            data={data}
            onFilterChange={handleMicrosoftFilterChange}
          />
        )}
        {data.length > 0 && url === "intuit" && (
          <IntuitTable data={data} />
        )}
      </div>
    </div>
  );
}
