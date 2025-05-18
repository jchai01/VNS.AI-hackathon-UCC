import React, { useEffect, useState } from 'react';
import { 
  getRequestsByHourOfDay, 
  getMostRequestedFiles, 
  getStatusCodeDistribution, 
  getTopReferrers, 
  parseUserAgents, 
  getTopIPAddress
} from '../utils/logUtils';
import { format } from 'date-fns';

import FilterPanel from '../components/FilterPanel';
import StatsOverview from '../components/StatsOverview';
import RequestsChart from '../components/RequestsChart';
import BrowserChart from '../components/BrowserChart';
import WorldMap from '../components/WorldMap';
import StatusCodesTable from '../components/StatusCodesTable';
import TopReferrers from '../components/TopReferrers';
import MostRequestedFiles from '../components/MostRequestedFiles';
import TopIPAddress from '../components/TopIPAddress';

const Dashboard = ({ logData, isLoading, uploadProgress, processingProgress, filters, setFilters }) => {
  const [filteredData, setFilteredData] = useState(null);

  // Function to filter log data based on filters
  const filterLogData = (data) => {
    if (!data || !data.entries) return null;

    console.log('Filtering data with filters:', filters);
    console.log('Total entries before filtering:', data.entries.length);

    let filtered = data.entries.filter(entry => {
      // Date filter
      if (filters.dateFrom || filters.dateTo) {
        if (!entry.dateTime) {
          console.log('Entry has no dateTime:', entry);
          return false;
        }

        const entryDate = new Date(entry.dateTime);
        if (isNaN(entryDate.getTime())) {
          console.log('Invalid entry date:', entry.dateTime);
          return false;
        }

        // Set time to start of day for proper date comparison
        entryDate.setUTCHours(0, 0, 0, 0);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setUTCHours(0, 0, 0, 0);
          if (fromDate > entryDate) {
            console.log('Entry date before from date:', {
              entryDate: entryDate.toISOString(),
              fromDate: fromDate.toISOString()
            });
            return false;
          }
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setUTCHours(0, 0, 0, 0);
          if (toDate < entryDate) {
            console.log('Entry date after to date:', {
              entryDate: entryDate.toISOString(),
              toDate: toDate.toISOString()
            });
            return false;
          }
        }
      }

      // Method filter
      if (filters.method && entry.method !== filters.method) {
        console.log('Method mismatch:', {
          entryMethod: entry.method,
          filterMethod: filters.method
        });
        return false;
      }

      // Path filter
      if (filters.path && !entry.path.includes(filters.path)) {
        console.log('Path mismatch:', {
          entryPath: entry.path,
          filterPath: filters.path
        });
        return false;
      }

      // Status code filter - only apply if not -1 (which means "no filter")
      if (filters.statusCode && filters.statusCode !== '-1' && String(entry.statusCode) !== filters.statusCode) {
        console.log('Status code mismatch:', {
          entryStatusCode: entry.statusCode,
          filterStatusCode: filters.statusCode,
          comparison: String(entry.statusCode) !== filters.statusCode
        });
        return false;
      }

      // Browser filter
      if (filters.browser) {
        const userAgent = entry.userAgent.toLowerCase();
        const browser = filters.browser.toLowerCase();
        if (!userAgent.includes(browser)) {
          console.log('Browser mismatch:', {
            entryUserAgent: userAgent,
            filterBrowser: browser
          });
          return false;
        }
      }

      return true;
    });

    console.log('Total entries after filtering:', filtered.length);
    if (filtered.length > 0) {
      console.log('Sample of filtered entries:', filtered.slice(0, 2));
    }

    return {
      ...data,
      entries: filtered,
      totalRequests: filtered.length,
      uniqueVisitors: new Set(filtered.map(entry => entry.ipAddress)).size,
      totalBandwidth: filtered.reduce((sum, entry) => sum + entry.bytes, 0)
    };
  };

  // Update filtered data when logData or filters change
  useEffect(() => {
    if (logData) {
      console.log('Dashboard: Filters changed:', filters);
      const filtered = filterLogData(logData);
      console.log('Dashboard: Filtered data:', filtered);
      setFilteredData(filtered);
    }
  }, [logData, filters]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Log File</h2>
          <div className="w-full max-w-md">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200">
                    Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-primary-600">
                    {uploadProgress < 100 ? uploadProgress : processingProgress}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                <div
                  style={{ width: `${uploadProgress < 100 ? uploadProgress : processingProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>Current operation: {uploadProgress < 100 ? 'Reading file' : 'Parsing log entries'}</p>
            {processingProgress > 0 && (
              <p className="mt-1">
                Processed {processingProgress}% of log entries
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!logData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to Nginx Access Log Analyzer</h2>
        <p className="text-gray-600 mb-6">Upload an Nginx access log file to get started</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-xl mx-auto">
          <h3 className="font-semibold text-gray-700 mb-2">Compatible log formats</h3>
          <code className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            {`log_format main '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"';`}
          </code>
        </div>
      </div>
    );
  }
  
  // Use filteredData instead of logData for all components
  const stats = {
    sessions: filteredData?.uniqueVisitors || 0,
    requests: filteredData?.totalRequests || 0,
    bandwidth: filteredData?.totalBandwidth || 0
  };

  const hourlyData = filteredData ? getRequestsByHourOfDay(filteredData.entries) : { labels: [], data: [] };
  const browserData = filteredData ? parseUserAgents(filteredData.entries) : { browsers: [], devices: [] };
  const statusCodes = filteredData ? getStatusCodeDistribution(filteredData.entries) : [];
  const topReferrers = filteredData ? getTopReferrers(filteredData.entries) : [];
  const mostRequestedFiles = filteredData ? getMostRequestedFiles(filteredData.entries) : [];
  const topIPAddresses = filteredData ? getTopIPAddress(filteredData.entries) : [];

  return (
    <>
      <FilterPanel filters={filters} setFilters={setFilters} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatsOverview stats={stats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RequestsChart labels={hourlyData.labels} data={hourlyData.data} />
        <BrowserChart browsers={browserData.browsers} />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <WorldMap entries={filteredData?.entries || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatusCodesTable statusCodes={statusCodes} />
        <TopReferrers referrers={topReferrers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MostRequestedFiles files={mostRequestedFiles} />
        <TopIPAddress ipAddresses={topIPAddresses} />
      </div>
    </>
  );
};

export default Dashboard; 
