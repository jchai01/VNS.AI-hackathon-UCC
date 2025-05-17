import React, { useEffect, useState } from 'react';
import { 
  getRequestsByHourOfDay, 
  getMostRequestedFiles, 
  getStatusCodeDistribution, 
  getTopReferrers, 
  parseUserAgents 
} from '../utils/logUtils';
import { format } from 'date-fns';

import StatsOverview from '../components/StatsOverview';
import RequestsChart from '../components/RequestsChart';
import BrowserChart from '../components/BrowserChart';
import WorldMap from '../components/WorldMap';
import StatusCodesTable from '../components/StatusCodesTable';
import TopReferrers from '../components/TopReferrers';
import MostRequestedFiles from '../components/MostRequestedFiles';

const Dashboard = ({ logData, isLoading, uploadProgress, processingProgress }) => {
  const [hourlyRequests, setHourlyRequests] = useState({ labels: [], data: [] });
  const [mostRequestedFiles, setMostRequestedFiles] = useState([]);
  const [statusCodes, setStatusCodes] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [userAgentData, setUserAgentData] = useState({ browsers: [] });
  const [timeInterval, setTimeInterval] = useState('hourly');
  
  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState({ min: '', max: '' });
  const [currentFileName, setCurrentFileName] = useState('');
  
  // Filtered data
  const [filteredEntries, setFilteredEntries] = useState([]);
  
  // Set initial date range and filename based on log data
  useEffect(() => {
    if (logData && logData.entries && logData.entries.length > 0) {
      // Sort entries by date
      const sortedEntries = [...logData.entries].sort((a, b) => 
        a.dateTime.getTime() - b.dateTime.getTime()
      );
      
      const firstDate = sortedEntries[0].dateTime;
      const lastDate = sortedEntries[sortedEntries.length - 1].dateTime;
      
      // Format dates for input elements
      const firstDateStr = format(firstDate, 'yyyy-MM-dd');
      const lastDateStr = format(lastDate, 'yyyy-MM-dd');
      
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
      
      // Initial filtering
      setFilteredEntries(logData.entries);
    }
  }, [logData]);
  
  // Apply date filters when date range changes
  useEffect(() => {
    if (!logData || !logData.entries || !startDate || !endDate) return;
    
    // Convert string dates to Date objects for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Filter entries by date range
    const filtered = logData.entries.filter(entry => {
      const entryDate = new Date(entry.dateTime);
      return entryDate >= startDateTime && entryDate <= endDateTime;
    });
    
    setFilteredEntries(filtered);
  }, [startDate, endDate, logData]);
  
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
    }
  }, [filteredEntries, timeInterval]);
  
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
      </div>
      
      <StatsOverview 
        stats={{
          sessions: new Set(filteredEntries.map(entry => entry.ipAddress)).size,
          requests: filteredEntries.length,
          bandwidth: filteredEntries.reduce((sum, entry) => sum + entry.bytes, 0),
        }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RequestsChart 
          labels={hourlyRequests.labels}
          data={hourlyRequests.data}
          timeInterval={timeInterval}
        />
        <WorldMap entries={filteredEntries} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <BrowserChart browsers={userAgentData.browsers} />
        <StatusCodesTable statusCodes={statusCodes} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TopReferrers referrers={topReferrers} />
        <MostRequestedFiles files={mostRequestedFiles} />
      </div>
    </div>
  );
};

export default Dashboard; 