import { useState, useRef, useEffect } from "react";
import axios from "axios";
import SalesforceTable from "./components/Tables/SalesforceTable";
import SalesforceFieldSelector from "./components/Field_Selectors/SalesforceFieldSelector";
import OracleTable from "./components/Tables/OracleTable";
import ShopifyTable from "./components/Tables/ShopifyTable";
import MicrosoftTable from "./components/Tables/MicrosoftTable";
import ProductInfo from "./components/ProductInfo";
import MicrosoftFieldSelection from "./components/Field_Selectors/MicorsoftFieldSelection";

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
      let endpoint = `http://localhost:5000/api/v1/${url}/fetch`;
      const params = new URLSearchParams();

      if (url === "microsoft") {
        // Microsoft-specific params
        if (Object.keys(microsoftFields).length > 0) {
          const fieldsToFetch = Object.keys(microsoftFields).filter(key => microsoftFields[key]);
          params.append('fields', JSON.stringify(fieldsToFetch));
        }
        if (selectedFilters.industry?.length > 0) {
          params.append('industries', JSON.stringify(selectedFilters.industry));
        }
        if (selectedFilters.product?.length > 0) {
          params.append('products', JSON.stringify(selectedFilters.product));
        }
        if (selectedFilters.solution?.length > 0) {
          params.append('solutions', JSON.stringify(selectedFilters.solution));
        }
        if (selectedFilters.services?.length > 0) {
          params.append('services', JSON.stringify(selectedFilters.services));
        }
        if (selectedFilters.country?.length > 0) {
          params.append('countries', JSON.stringify(selectedFilters.country));
        }

        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
      }

      else if (url === "salesforce") {
        // Salesforce-specific params
        setSalesforceFields(pendingSalesforceFields);

        if (pendingSalesforceFields.length > 0) {
          params.append("fields", JSON.stringify(pendingSalesforceFields));
        }
        if (selectedFilters.salesforceExpertise?.length > 0) {
          params.append("salesforceExpertise", JSON.stringify(selectedFilters.salesforceExpertise));
        }
        if (selectedFilters.industryExpertise?.length > 0) {
          params.append("industryExpertise", JSON.stringify(selectedFilters.industryExpertise));
        }
        if (selectedFilters.country?.length > 0) {
          params.append('countryFilters', JSON.stringify(selectedFilters.country));
        }
        if (selectedFilters.region?.length > 0) {
          params.append('regionFilters', JSON.stringify(selectedFilters.region));
        }

        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
      }
      console.log("Fetching from endpoint:", endpoint);

      const response = await axios.get(endpoint);

      if (response.data.success) {
        setData(response.data.data);
      } else {
        throw new Error(response.data.error || "Unknown error occurred");
      }

    } catch (err) {
      setError(err.message);
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
  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);

      // Create endpoint with appropriate parameters
      let endpoint = `http://localhost:5000/api/v1/${url}/downloadExcel`;
      const params = new URLSearchParams();

      // Set the appropriate fields parameter based on platform
      if (url === "microsoft") {
        const fieldsToExport = Object.keys(microsoftFields).filter(k => microsoftFields[k]);
        if (fieldsToExport.length > 0) {
          params.append('fields', JSON.stringify(fieldsToExport));
        }
      } else if (url === "salesforce") {
        // Use the current state of salesforceFields
        if (pendingSalesforceFields.length > 0) {
          params.append('fields', JSON.stringify(pendingSalesforceFields));
        }
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await axios.get(endpoint, {
        responseType: "blob"
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${url}_partners.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setDownloading(false);
    } catch (error) {
      console.error("Download failed:", error.message);
      alert("Failed to download Excel file. Please try again.");
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
        {data.length > 0 && url === "microsoft" && (
          <MicrosoftTable
            data={data}
            onFilterChange={handleMicrosoftFilterChange}
          />
        )}
      </div>
    </div>
  );
}
