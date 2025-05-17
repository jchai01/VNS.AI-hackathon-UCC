import React, { useState } from "react";

const TopIPAddress = ({ files }) => {
  const [showAssets, setShowAssets] = useState(false);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Top 10 IP Address</h2>
      </div>

      <div className="overflow-x-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Page
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hits
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="truncate max-w-md">{item.ip}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                  {item.hits}
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopIPAddress;
