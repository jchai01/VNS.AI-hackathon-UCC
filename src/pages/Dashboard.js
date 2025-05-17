import React, { useEffect, useState } from 'react';
import { 
  getRequestsByHourOfDay, 
  getMostRequestedFiles, 
  getStatusCodeDistribution, 
  getTopReferrers, 
  parseUserAgents, 
  getTopIPAddress
} from '../utils/logUtils';

import StatsOverview from '../components/StatsOverview';
import RequestsChart from '../components/RequestsChart';
import DeviceChart from '../components/DeviceChart';
import BrowserChart from '../components/BrowserChart';
import WorldMap from '../components/WorldMap';
import StatusCodesTable from '../components/StatusCodesTable';
import TopReferrers from '../components/TopReferrers';
import MostRequestedFiles from '../components/MostRequestedFiles';
import TopIPAddress from '../components/TopIPAddress';

const Dashboard = ({ logData, isLoading, uploadProgress, processingProgress }) => {
  const [hourlyRequests, setHourlyRequests] = useState({ labels: [], data: [] });
  const [mostRequestedFiles, setMostRequestedFiles] = useState([]);
  const [statusCodes, setStatusCodes] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [topIPAddress, setTopIPAddress] = useState([]);
  const [userAgentData, setUserAgentData] = useState({ browsers: [], devices: [] });
  
  useEffect(() => {
    if (logData && logData.entries && logData.entries.length > 0) {
      // Process data for charts
      setHourlyRequests(getRequestsByHourOfDay(logData.entries));
      setMostRequestedFiles(getMostRequestedFiles(logData.entries));
      setTopIPAddress(getTopIPAddress(logData.entries));
      setStatusCodes(getStatusCodeDistribution(logData.entries));
      setTopReferrers(getTopReferrers(logData.entries));
      setUserAgentData(parseUserAgents(logData.entries));
    }
  }, [logData]);
  
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
      <StatsOverview 
        stats={{
          sessions: logData.uniqueVisitors,
          requests: logData.totalRequests,
          bandwidth: logData.totalBandwidth,
        }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RequestsChart 
          labels={hourlyRequests.labels}
          data={hourlyRequests.data}
          logData={logData}
        />
        <WorldMap entries={logData.entries} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <DeviceChart devices={userAgentData.devices} />
        <BrowserChart browsers={userAgentData.browsers} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatusCodesTable statusCodes={statusCodes} />
        <TopReferrers referrers={topReferrers} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MostRequestedFiles files={mostRequestedFiles} />
        <TopIPAddress files={topIPAddress} />
      </div>
      
    </div>
  );
};

export default Dashboard; 
