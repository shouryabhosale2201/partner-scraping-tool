import React from "react";

const SalesforceTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto px-4 mt-6">
      <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
        <thead className="bg-base-200 text-base font-semibold">
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Tagline</th>
            <th>Description</th>
            <th>Expertise</th>
            <th>Industries</th>
            <th>Services</th>
            <th>Extended Description</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
            >
              <th className="py-2">{index + 1}</th>
              <td className="py-2">{item.name}</td>
              <td className="py-2">{item.tagline}</td>
              <td className="py-2">
                <div className="max-h-[100px] overflow-y-auto">{item.description}</div>
              </td>
              <td className="py-2">
                <div className="max-h-[100px] overflow-y-auto">{item.expertise}</div>
              </td>
              <td className="py-2">
                <div className="max-h-[100px] overflow-y-auto">{item.industries}</div>
              </td>
              <td className="py-2">
                <div className="max-h-[100px] overflow-y-auto">{item.services}</div>
              </td>
              <td className="py-2">
                <div className="max-h-[100px] overflow-y-auto">{item.extendedDescription}</div>
              </td>
              <td className="py-2">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Visit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Tagline</th>
            <th>Description</th>
            <th>Expertise</th>
            <th>Industries</th>
            <th>Services</th>
            <th>Extended Description</th>
            <th>Link</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default SalesforceTable;
