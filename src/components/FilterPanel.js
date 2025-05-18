import React from 'react';

const FilterPanel = ({ filters, setFilters }) => {
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      method: '',
      path: '',
      statusCode: '',
      browser: ''
    });
  };

  // Format date for display (YYYY-MM-DD)
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        {Object.values(filters).some(v => v !== '') && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            name="dateFrom"
            value={formatDateForDisplay(filters.dateFrom)}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            name="dateTo"
            value={formatDateForDisplay(filters.dateTo)}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">HTTP Method</label>
          <select
            name="method"
            value={filters.method}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Path</label>
          <input
            type="text"
            name="path"
            value={filters.path}
            onChange={handleFilterChange}
            placeholder="/api/..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status Code</label>
          <select
            name="statusCode"
            value={filters.statusCode}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All Status Codes</option>
            <option value="200">200 - OK</option>
            <option value="201">201 - Created</option>
            <option value="301">301 - Moved Permanently</option>
            <option value="302">302 - Found</option>
            <option value="400">400 - Bad Request</option>
            <option value="401">401 - Unauthorized</option>
            <option value="403">403 - Forbidden</option>
            <option value="404">404 - Not Found</option>
            <option value="500">500 - Internal Server Error</option>
            <option value="502">502 - Bad Gateway</option>
            <option value="503">503 - Service Unavailable</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Browser</label>
          <select
            name="browser"
            value={filters.browser}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All Browsers</option>
            <option value="Chrome">Chrome</option>
            <option value="Firefox">Firefox</option>
            <option value="Safari">Safari</option>
            <option value="Edge">Edge</option>
            <option value="Opera">Opera</option>
            <option value="Internet Explorer">Internet Explorer</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel; 