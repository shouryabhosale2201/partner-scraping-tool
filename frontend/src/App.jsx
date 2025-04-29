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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // For Microsoft - object-based field selection
  const [microsoftFields, setMicrosoftFields] = useState({});
  // For Salesforce - array-based field selection
  const [salesforceFields, setSalesforceFields] = useState([]);
  const [pendingSalesforceFields, setPendingSalesforceFields] = useState([]);
  const tableRef = useRef(null);

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
    setLoading(true);
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
        if (response.data.success) setData(response.data.data);
        else throw new Error(response.data.error);
      } else if (url === "salesforce") {
        // For Salesforce, pass selected fields for scraping
        const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`, {
          params: { fields: JSON.stringify(salesforceFields) }
        });
        if (response.data.success) setData(response.data.data);
        else throw new Error(response.data.error);
      } else {
        // For other platforms, use the basic approach
        const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`);
        if (response.data.success) setData(response.data.data);
        else throw new Error(response.data.error);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetch = async (selectedFilters = {}) => {
    setLoading(true);
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
      setLoading(false);
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

  const handleDownloadExcel = async () => {
    try {
      const params = {};
      
      // Set the appropriate fields parameter based on platform
      if (url === "microsoft") {
        params.fields = JSON.stringify(Object.keys(microsoftFields).filter(k => microsoftFields[k]));
      } else if (url === "salesforce") {
        params.fields = JSON.stringify(salesforceFields);
      }
      
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/downloadExcel`, {
        params,
        responseType: "blob"
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${url || "Partners"}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error.message);
      alert("Failed to download Excel file. Please try again.");
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

        <div className="flex space-x-3 justify-center">
          <button
            onClick={handleScrape}
            disabled={loading}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-orange-400"
          >
            Scrape Data
          </button>
          <button
            onClick={() => handleFetch()}
            disabled={loading}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-orange-400"
          >
            Fetch Stored Data
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-gray-600 disabled:bg-orange-400"
          >
            Download Excel
          </button>
        </div>
        {loading && <p className="text-center mt-4">Loading...</p>}
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