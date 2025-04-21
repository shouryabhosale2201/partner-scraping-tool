import { useState, useRef, useEffect } from "react";
import axios from "axios";
import SalesforceTable from "./components/SalesforceTable";
import OracleTable from "./components/OracleTable";
import ShopifyTable from "./components/ShopifyTable";
import MicrosoftTable from "./components/MicrosoftTable";
import ProductInfo from "./components/ProductInfo";

export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  useEffect(() => {
    if (data.length > 0 && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data, url]);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    setData([]);
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`);
      if (response.data.success) setData(response.data.data);
      else throw new Error(response.data.error);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetch = async (selectedFilters = {}) => {
    setLoading(true);
    setError(null);
    if (url === "microsoft") {
      try {
        let endpoint = `http://localhost:5000/api/v1/${url}/fetch`;

        // Create query parameters matching backend expectations
        const params = new URLSearchParams();

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

        const response = await axios.get(endpoint);
        if (response.data.success) setData(response.data.data);
        else throw new Error(response.data.error);
      } catch (err) {
        setError(err.message);
      }
    }

    if (url === "salesforce") {
      try {
        const endpoint = "http://localhost:5000/api/v1/salesforce/fetch";

        const params = new URLSearchParams();

        // Salesforce filters are a single array (not sectioned)
        if (selectedFilters.length > 0) {
          params.append("filters", JSON.stringify(selectedFilters));
        }

        const response = await axios.get(`${endpoint}?${params.toString()}`);

        if (response.data.success) {
          setData(response.data.data);
        } else {
          throw new Error(response.data.error);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    setLoading(false);
  };
  // Handle filter changes for Microsoft table
  const handleMicrosoftFilterChange = (selectedFilters) => {
    if (url === 'microsoft') {
      handleFetch(selectedFilters);
    }
  };

  const handleSalesforceFilterChange = (selectedFilters) => {
    if (url === 'microsoft') {
      handleFetch(selectedFilters);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/downloadExcel`, {
        responseType: "blob",
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${url || "Partners"}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Download failed:", error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">

      <div className="bg-white shadow-lg rounded-lg p-6 max-w-3xl w-full">
        <ProductInfo />
        <select
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setData([]);
          }}
          className="w-1/2 flex mx-auto p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4 mt-4"
        >
          <option value="">Select a source</option>
          <option value="salesforce">Salesforce</option>
          <option value="oracle">Oracle</option>
          <option value="shopify">Shopify</option>
          <option value="microsoft">Microsoft</option>
        </select>

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