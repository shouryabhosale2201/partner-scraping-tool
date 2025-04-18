import { useState } from "react";
import axios from "axios";
import SalesforceTable from "./components/SalesforceTable";
import OracleTable from "./components/OracleTable";
import ShopifyTable from "./components/ShopifyTable";
import MicrosoftTable from "./components/MicrosoftTable";

export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setData([]);
    try {
      const response = await axios.get(`http://localhost:5000/api/v1/${url}/fetch`);
      if (response.data.success) setData(response.data.data);
      else throw new Error(response.data.error);

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
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Avalara's Web Scraper</h1>
        <h2 className="text-xl font-bold text-center text-gray-600 mb-4">What is our product?</h2>
        <p className="text-l text-center text-gray-600 mb-4">​Our solution offers real-time data scraping of partners associated with Oracle, Microsoft, Salesforce, and Shopify, supplying essential details to those who need them.</p>
        <h2 className="text-xl font-bold text-center text-gray-600 mb-4">Why use our product?</h2>
        <p className="text-l text-center text-gray-600 mb-4">Our product swiftly delivers data on thousands of partners, complete with relevant filters, within seconds, eliminating the need for days or even months of manual searching and significantly enhancing team productivity. Additionally, the capability to download all data, along with filters, in Excel format adds further convenience.</p>
        <h2 className="text-xl font-bold text-center text-gray-600 mb-4">How to use it?</h2>
        <p className="text-base text-left text-gray-600 mb-2">Step 1: Select the company whose partners' data is required.</p>

        <p className="text-base text-left text-gray-600 mb-2">Step 2: You'll have 3 options:</p>

        <ul className="list-disc pl-6 text-base text-gray-600 space-y-2">
          <li>Scrape live data present on the websites at that moment (this takes some time).</li>
          <li>Fetch data present already in our database (which can be automatically updated on a daily/weekly basis).</li>
          <li>Download the necessary data in Excel.</li>
        </ul>

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
            onClick={handleFetch}
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
        {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
      </div>
      <div>
        {data.length > 0 && url === "salesforce" && <SalesforceTable data={data} />}
        {data.length > 0 && url === "oracle" && <OracleTable data={data} />}
        {data.length > 0 && url === "shopify" && <ShopifyTable data={data} />}
        {data.length > 0 && url === "microsoft" && <MicrosoftTable data={data} />}
      </div>
    </div>
  );
}