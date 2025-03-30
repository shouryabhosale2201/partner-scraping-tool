import { useState } from "react";
import axios from "axios";

export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:5000/scrape", { url });
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
      const response = await axios.get("http://localhost:5000/fetch");
      if (response.data.success) setData(response.data.data);
      
      else throw new Error(response.data.error);
      console.log(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Web Scraper</h1>
        <input
          type="text"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex space-x-3 justify-center">
          <button
            onClick={handleScrape}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            Scrape Data
          </button>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
          >
            Fetch Stored Data
          </button>
        </div>
        {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
      </div>
      <div className="mt-6 w-full max-w-lg">
        {data.map((item, index) => (
          <div key={index} className="bg-white shadow-md rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{item.name}</h2>
            <p className="text-gray-600">{item.tagline}</p>
            <a href={item.link} target="_blank" className="text-blue-500 hover:underline">
              Visit Page
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}