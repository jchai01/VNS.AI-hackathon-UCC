import React, { useEffect, useState } from 'react';
import { 
  getRequestsByHourOfDay, 
  getMostRequestedFiles, 
  getStatusCodeDistribution, 
  getTopReferrers, 
  parseUserAgents, 
  getTopIPAddress,
  getHttpMethodsDistribution,
  getHumanVsBotTraffic,
  getResponseSizeDistribution
} from '../utils/logUtils';
import { format } from 'date-fns';

import StatsOverview from '../components/StatsOverview';
import RequestsChart from '../components/RequestsChart';
import BrowserChart from '../components/BrowserChart';
import WorldMap from '../components/WorldMap';
import StatusCodesTable from '../components/StatusCodesTable';
import TopReferrers from '../components/TopReferrers';
import MostRequestedFiles from '../components/MostRequestedFiles';
import TopIPAddress from '../components/TopIPAddress';
import HttpMethodsChart from '../components/HttpMethodsChart';
import OsDistributionChart from '../components/OsDistributionChart';
import HumanVsBotChart from '../components/HumanVsBotChart';
import ResponseSizeChart from '../components/ResponseSizeChart';
import AnomalyDetection from '../components/AnomalyDetection';
import AnomalyTimeline from '../components/AnomalyTimeline';
import AnomalySummary from '../components/AnomalySummary';
// import AnomalyCorrelationMatrix from '../components/AnomalyCorrelationMatrix';

const Dashboard = ({ logData, isLoading, uploadProgress, processingProgress }) => {
  const [hourlyRequests, setHourlyRequests] = useState({ labels: [], data: [] });
  const [mostRequestedFiles, setMostRequestedFiles] = useState([]);
  const [statusCodes, setStatusCodes] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [userAgentData, setUserAgentData] = useState({ browsers: [], devices: [], operatingSystems: [] });
  const [timeInterval, setTimeInterval] = useState('hourly');
  const [topIPAddress, setTopIPAddress] = useState([]);
  const [httpMethods, setHttpMethods] = useState([]);
  const [humanVsBotTraffic, setHumanVsBotTraffic] = useState([]);
  const [responseSizeData, setResponseSizeData] = useState([]);
  
  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState({ min: '', max: '' });
  const [currentFileName, setCurrentFileName] = useState('');
  
  // New filter states
  const [methodFilter, setMethodFilter] = useState('all');
  const [availableMethods, setAvailableMethods] = useState([]);
  const [ipAddressFilter, setIpAddressFilter] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState('all');
  const [availableStatusCodes, setAvailableStatusCodes] = useState([]);
  const [countryFilter, setCountryFilter] = useState('all');
  const [availableCountries, setAvailableCountries] = useState([]);
  
  // Filtered data
  const [filteredEntries, setFilteredEntries] = useState([]);
  
  // Add new state for anomaly data
  const [anomalyData, setAnomalyData] = useState(null);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
  
  // Set initial date range and filename based on log data
  useEffect(() => {
    if (logData && logData.entries && logData.entries.length > 0) {

      // Sort entries by date - handle ISO string dates from backend
      const sortedEntries = [...logData.entries].sort((a, b) => {
        const dateA = typeof a.dateTime === 'string' ? new Date(a.dateTime) : a.dateTime;
        const dateB = typeof b.dateTime === 'string' ? new Date(b.dateTime) : b.dateTime;
        return dateA - dateB;
      });
      
      // Convert to Date objects if they are strings
      const firstDateObj = typeof sortedEntries[0].dateTime === 'string' 
        ? new Date(sortedEntries[0].dateTime) 
        : sortedEntries[0].dateTime;
      
      const lastDateObj = typeof sortedEntries[sortedEntries.length - 1].dateTime === 'string'
        ? new Date(sortedEntries[sortedEntries.length - 1].dateTime)
        : sortedEntries[sortedEntries.length - 1].dateTime;
      
      // Format dates for input elements
      const firstDateStr = format(firstDateObj, 'yyyy-MM-dd');
      const lastDateStr = format(lastDateObj, 'yyyy-MM-dd');
      
      setDateRange({
        min: firstDateStr,
        max: lastDateStr
      });
      
      setStartDate(firstDateStr);
      setEndDate(lastDateStr);
      
      // Set the file name if available
      if (logData.fileName) {
        setCurrentFileName(logData.fileName);
      }
      
      // Extract unique HTTP methods, status codes and countries
      const methods = new Set();
      const statuses = new Set();
      const countries = new Set();
      
      logData.entries.forEach(entry => {
        if (entry.method) methods.add(entry.method);
        if (entry.statusCode) statuses.add(entry.statusCode);
        if (entry.country) countries.add(entry.country);
      });
      
      setAvailableMethods(Array.from(methods).sort());
      setAvailableStatusCodes(Array.from(statuses).sort((a, b) => a - b));
      setAvailableCountries(Array.from(countries).sort());
      
      // Initial filtering
      setFilteredEntries(logData.entries);

      // Process data for charts
      setHourlyRequests(getRequestsByHourOfDay(logData.entries));
      setMostRequestedFiles(getMostRequestedFiles(logData.entries));
      setTopIPAddress(getTopIPAddress(logData.entries));
      setStatusCodes(getStatusCodeDistribution(logData.entries));
      setTopReferrers(getTopReferrers(logData.entries));
      setUserAgentData(parseUserAgents(logData.entries));
      setHttpMethods(getHttpMethodsDistribution(logData.entries));
      setHumanVsBotTraffic(getHumanVsBotTraffic(logData.entries));
      setResponseSizeData(getResponseSizeDistribution(logData.entries));
    }
  }, [logData]);
  
  // Apply all filters when any filter changes
  useEffect(() => {
    if (!logData || !logData.entries) return;
    
    // Convert string dates to Date objects for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Filter entries by all filters
    const filtered = logData.entries.filter(entry => {
      // Date filter
      const entryDate = new Date(entry.dateTime);
      const passesDateFilter = entryDate >= startDateTime && entryDate <= endDateTime;
      
      // Method filter
      const passesMethodFilter = methodFilter === 'all' || entry.method === methodFilter;
      
      // IP address filter
      const passesIpFilter = !ipAddressFilter || entry.ipAddress.includes(ipAddressFilter);
      
      // Status code filter
      const passesStatusFilter = statusCodeFilter === 'all' || entry.statusCode.toString() === statusCodeFilter;
      
      // Country filter
      const passesCountryFilter = countryFilter === 'all' || entry.country === countryFilter;
      
      return passesDateFilter && passesMethodFilter && passesIpFilter && passesStatusFilter && passesCountryFilter;
    });
    
    setFilteredEntries(filtered);
  }, [startDate, endDate, methodFilter, ipAddressFilter, statusCodeFilter, countryFilter, logData]);
  
  // Process filtered data for charts
  useEffect(() => {
    if (filteredEntries.length > 0) {
      // Process data for charts based on filtered entries
      if (timeInterval === 'hourly') {
        setHourlyRequests(getRequestsByHourOfDay(filteredEntries));
      } else {
        // Handle daily interval
        const dailyData = getRequestsByHourOfDay(filteredEntries, 'daily');
        setHourlyRequests(dailyData);
      }
      
      setMostRequestedFiles(getMostRequestedFiles(filteredEntries));
      setStatusCodes(getStatusCodeDistribution(filteredEntries));
      setTopReferrers(getTopReferrers(filteredEntries));
      setUserAgentData(parseUserAgents(filteredEntries));
      setHttpMethods(getHttpMethodsDistribution(filteredEntries));
      setHumanVsBotTraffic(getHumanVsBotTraffic(filteredEntries));
      setResponseSizeData(getResponseSizeDistribution(filteredEntries));
    }
  }, [filteredEntries, timeInterval]);
  
  // Add useEffect for fetching anomaly data when filtered entries change
  useEffect(() => {
    const fetchAnomalyData = async () => {
      if (filteredEntries.length > 0) {
        setIsLoadingAnomalies(true);
        try {
          const response = await fetch('http://localhost:5001/api/analyze-anomalies', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entries: filteredEntries })
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }
          
          const data = await response.json();
          setAnomalyData(data);
        } catch (error) {
          console.error('Error fetching anomaly data:', error);
          setAnomalyData({
            status: 'error',
            message: error.message,
            error_bursts: [],
            high_traffic_ips: [],
            unusual_patterns: []
          });
        } finally {
          setIsLoadingAnomalies(false);
        }
      }
    };
    
    // Fetch anomaly data but not on every filter change
    // Using a debounce approach by only triggering when filteredEntries changes significantly
    const entriesCountChanged = prevFilteredEntriesCount => {
      return !prevFilteredEntriesCount || 
        Math.abs(filteredEntries.length - prevFilteredEntriesCount) > (filteredEntries.length * 0.1);
    };
    
    // Store current entries count
    const currentCount = filteredEntries.length;
    
    // Only fetch if entries have changed significantly or there's no existing anomaly data
    if (!anomalyData || entriesCountChanged(anomalyData.entriesCount)) {
      fetchAnomalyData();
    }
  }, [filteredEntries]);
  
  // Clear all filters
  const clearFilters = () => {
    setMethodFilter('all');
    setIpAddressFilter('');
    setStatusCodeFilter('all');
    setCountryFilter('all');
  };
  
  // Function to export HTML summary report
  const exportSummaryReport = async () => {
    try {
      // Prepare data to send to the backend
      const exportData = {
        entries: filteredEntries,
        stats: {
          sessions: new Set(filteredEntries.map(entry => entry.ipAddress)).size,
          requests: filteredEntries.length,
          bandwidth: filteredEntries.reduce((sum, entry) => sum + entry.bytes, 0),
        },
        filters: {
          startDate,
          endDate,
          methodFilter,
          ipAddressFilter,
          statusCodeFilter,
          countryFilter
        }
      };
      
      // Send request to the backend to generate the HTML report
      const response = await fetch('http://localhost:5001/api/export-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const data = await response.json();
      
      // Create a blob with the HTML content
      const blob = new Blob([data.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting summary report:', error);
      alert('Failed to export summary report. Please try again.');
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Processing Log File</h2>
        
        <div className="max-w-xl mx-auto mb-8">
          <div className="mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Uploading</span>
              <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
          
          {uploadProgress === 100 && (
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Processing</span>
                <span className="text-sm font-medium text-gray-700">{processingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="text-gray-600 mt-4">
            {uploadProgress < 100 ? (
              <p>Uploading log file, please wait...</p>
            ) : (
              <p>Analyzing log data. This may take a moment for large files.</p>
            )}
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
  
  return (
    <div>
      {/* File info and date filters section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-medium text-gray-800">
              Log File: <span className="font-normal text-gray-600">{currentFileName || 'nginx-access.log'}</span>
            </h2>
            <p className="text-sm text-gray-500">
              <span className="font-medium">Total entries:</span> {filteredEntries.length.toLocaleString()} of {logData.entries.length.toLocaleString()}
            </p>
            <button
              onClick={() => exportSummaryReport()}
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Export Summary Report
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-700">From:</label>
              <input 
                type="date" 
                id="startDate"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={dateRange.min}
                max={dateRange.max}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="endDate" className="text-sm font-medium text-gray-700">To:</label>
              <input 
                type="date" 
                id="endDate"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={dateRange.min}
                max={dateRange.max}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="timeInterval" className="text-sm font-medium text-gray-700">View:</label>
              <select
                id="timeInterval"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={timeInterval}
                onChange={(e) => setTimeInterval(e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Additional filters section */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">Additional Filters</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              Clear all filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Method filter */}
            <div className="flex flex-col">
              <label htmlFor="methodFilter" className="text-xs font-medium text-gray-700 mb-1">HTTP Method:</label>
              <select
                id="methodFilter"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option value="all">All Methods</option>
                {availableMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            
            {/* IP Address filter */}
            <div className="flex flex-col">
              <label htmlFor="ipFilter" className="text-xs font-medium text-gray-700 mb-1">IP Address:</label>
              <input
                type="text"
                id="ipFilter"
                placeholder="Filter by IP"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={ipAddressFilter}
                onChange={(e) => setIpAddressFilter(e.target.value)}
              />
            </div>
            
            {/* Status Code filter */}
            <div className="flex flex-col">
              <label htmlFor="statusFilter" className="text-xs font-medium text-gray-700 mb-1">Status Code:</label>
              <select
                id="statusFilter"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={statusCodeFilter}
                onChange={(e) => setStatusCodeFilter(e.target.value)}
              >
                <option value="all">All Status Codes</option>
                {availableStatusCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            
            {/* Country filter */}
            <div className="flex flex-col">
              <label htmlFor="countryFilter" className="text-xs font-medium text-gray-700 mb-1">Country:</label>
              <select
                id="countryFilter"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="all">All Countries</option>
                {availableCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <StatsOverview 
        stats={{
          sessions: new Set(filteredEntries.map(entry => entry.ipAddress)).size,
          requests: filteredEntries.length,
          bandwidth: filteredEntries.reduce((sum, entry) => sum + entry.bytes, 0),
        }}
      />
      
      
      {/* Add Anomaly Correlation Section
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
          <AnomalyCorrelationMatrix 
            anomalyData={anomalyData}
            logData={filteredEntries} 
          />
        </div>
      </div> */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RequestsChart 
          labels={hourlyRequests.labels}
          data={hourlyRequests.data}
          timeInterval={timeInterval}
        />
        <WorldMap logData={filteredEntries} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <BrowserChart browsers={userAgentData.browsers} />
        <StatusCodesTable statusCodes={statusCodes} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MostRequestedFiles files={mostRequestedFiles} />
        <TopIPAddress files={topIPAddress} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TopReferrers referrers={topReferrers} />
        <HttpMethodsChart methods={httpMethods} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <OsDistributionChart osData={userAgentData.operatingSystems} />
        <ResponseSizeChart sizeData={responseSizeData} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <HumanVsBotChart trafficData={humanVsBotTraffic} />
        <AnomalyDetection anomalyData={anomalyData} isLoading={isLoadingAnomalies} />
      </div>

      {/* Add Anomaly Timeline */}
      <div className="mb-6">
        <AnomalyTimeline 
          anomalyData={anomalyData} 
          logData={filteredEntries} 
        />
      </div>
      
      {/* Add Anomaly Summary */}
      <AnomalySummary anomalyData={anomalyData} />
    </div>
  );
};

export default Dashboard; 
