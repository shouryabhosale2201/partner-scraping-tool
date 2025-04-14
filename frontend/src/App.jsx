import { useState } from "react";
import axios from "axios";
import SalesforceTable from "./components/SalesforceTable";
import OracleTable from "./components/OracleTable";
import ShopifyTable from "./components/ShopifyTable";

export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/scrape`);
      if (response.data.success) setData(response.data.data);
      else throw new Error(response.data.error);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/fetch`);
      if (response.data.success) setData(response.data.data);

      else throw new Error(response.data.error);
      console.log(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/downloadExcel`, {
        responseType: "blob",
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "partners.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Download failed:", error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Web Scraper</h1>
        <select
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        >
          <option value="">Select a source</option>
          <option value="salesforce">Salesforce</option>
          <option value="oracle">Oracle</option>
          <option value="shopify">Shopify</option>
        </select>

        <div className="flex space-x-3 justify-center">
          <button
            onClick={handleScrape}
            disabled={loading}
            className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            Scrape Data
          </button>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
          >
            Fetch Stored Data
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-blue-700"
          >
            Download Excel
          </button>

        </div>
        {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
      </div>
      <div>
      {data.length > 0 && url === "salesforce" && <SalesforceTable data={data} />}
      {data.length > 0 && url === "oracle" && <OracleTable data={data} />}
      {data.length > 0 && url === "shopify" && <ShopifyTable data={data} />}
      </div>
    </div>
  );
}