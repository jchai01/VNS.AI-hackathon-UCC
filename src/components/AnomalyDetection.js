import React, { useState } from 'react';

const AnomalyDetection = ({ anomalyData, isLoading }) => {
  const [activeTab, setActiveTab] = useState('error_bursts');
  
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Anomaly Detection</h2>
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!anomalyData) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Anomaly Detection</h2>
        <p className="text-gray-500">No anomaly data available. Please analyze logs first.</p>
      </div>
    );
  }
  
  const { error_bursts, high_traffic_ips, unusual_patterns, status } = anomalyData;
  
  if (status === 'error') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Anomaly Detection</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error detecting anomalies: {anomalyData.message}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Anomaly Detection</h2>
      
      <div className="mb-4">
        <div className="flex border-b">
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'error_bursts' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('error_bursts')}
          >
            Error Bursts ({error_bursts.length})
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'high_traffic_ips' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('high_traffic_ips')}
          >
            High Traffic IPs ({high_traffic_ips.length})
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'unusual_patterns' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('unusual_patterns')}
          >
            Unusual Patterns ({unusual_patterns.length})
          </button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-96">
        {activeTab === 'error_bursts' && (
          <div>
            {error_bursts.length === 0 ? (
              <p className="text-gray-500 p-4">No error bursts detected.</p>
            ) : (
              <div className="space-y-4">
                {error_bursts.map((burst, index) => (
                  <div key={index} className="border rounded p-3 bg-red-50">
                    <h3 className="font-medium">Error Burst: {burst.time_period}</h3>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p><span className="font-medium">Error Count:</span> {burst.error_count}</p>
                        <p><span className="font-medium">IPs Involved:</span> {burst.ips_involved_count}</p>
                        <p><span className="font-medium">Z-Score:</span> {burst.z_score.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status Codes:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(burst.status_codes).map(([code, count]) => (
                            <span key={code} className="bg-white px-2 py-1 rounded text-sm border">
                              {code}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{burst.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'high_traffic_ips' && (
          <div>
            {high_traffic_ips.length === 0 ? (
              <p className="text-gray-500 p-4">No high traffic IPs detected.</p>
            ) : (
              <div className="space-y-4">
                {high_traffic_ips.map((ip, index) => (
                  <div key={index} className="border rounded p-3 bg-yellow-50">
                    <h3 className="font-medium">High Traffic IP: {ip.ip_address}</h3>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p><span className="font-medium">Request Count:</span> {ip.request_count}</p>
                        <p><span className="font-medium">Max Rate:</span> {ip.max_rate_per_window} requests/window</p>
                        <p><span className="font-medium">Traffic %:</span> {ip.traffic_percentage.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="font-medium">Status Codes:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(ip.status_code_distribution).map(([code, count]) => (
                            <span key={code} className="bg-white px-2 py-1 rounded text-sm border">
                              {code}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="font-medium">Top Paths:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(ip.path_distribution).slice(0, 3).map(([path, count]) => (
                          <span key={path} className="bg-white px-2 py-1 rounded text-sm border truncate max-w-[250px]">
                            {path}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{ip.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'unusual_patterns' && (
          <div>
            {unusual_patterns.length === 0 ? (
              <p className="text-gray-500 p-4">No unusual patterns detected.</p>
            ) : (
              <div className="space-y-4">
                {unusual_patterns.map((pattern, index) => (
                  <div key={index} className="border rounded p-3 bg-purple-50">
                    <h3 className="font-medium">
                      {pattern.type === 'unusual_hour_access' && 'Unusual Access Hours'}
                      {pattern.type === 'unusual_error_rate' && 'Unusual Error Rate'}
                      {pattern.type === 'unusual_request_rate' && 'Unusual Request Rate'}
                      : {pattern.ip_address}
                    </h3>
                    <div className="mt-2">
                      <p><span className="font-medium">Confidence:</span> {(pattern.confidence * 100).toFixed(2)}%</p>
                      
                      {pattern.type === 'unusual_hour_access' && (
                        <p><span className="font-medium">Unusual Hours:</span> {pattern.unusual_hours.join(', ')}</p>
                      )}
                      
                      {pattern.type === 'unusual_error_rate' && (
                        <div>
                          <p><span className="font-medium">Affected Paths:</span> {pattern.affected_paths.length}</p>
                          <p><span className="font-medium">Max Deviation:</span> {(pattern.max_deviation * 100).toFixed(2)}%</p>
                        </div>
                      )}
                      
                      {pattern.type === 'unusual_request_rate' && (
                        <p><span className="font-medium">Contribution to Anomalies:</span> {(pattern.contribution * 100).toFixed(2)}%</p>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{pattern.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyDetection; 