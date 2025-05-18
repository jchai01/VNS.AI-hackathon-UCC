import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Tooltip, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGeolocationData } from '../utils/csvParser';

const WorldMap = ({ logData, anomalyData }) => {
  const [locationData, setLocationData] = useState([]);
  const [geoData, setGeoData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pulseStep, setPulseStep] = useState(0);
  const [mapKey, setMapKey] = useState(Date.now()); // Add key for map reloading
  
  // Pulse animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseStep(prev => (prev + 1) % 30);
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
  
  // Force map reload when anomalyData changes
  useEffect(() => {
    if (anomalyData) {
      setMapKey(Date.now());
    }
  }, [anomalyData]);
  
  // Load geolocation data from CSV
  useEffect(() => {
    async function fetchGeoData() {
      setIsLoading(true);
      try {
        const data = await loadGeolocationData();
        setGeoData(data);
      } catch (error) {
        console.error('Failed to load geolocation data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGeoData();
  }, []);
  
  useEffect(() => {
    if (!logData || logData.length === 0 || Object.keys(geoData).length === 0) return;
    
    // Group entries by IP and analyze each group
    const ipGroups = {};
    
    logData.forEach(entry => {
      if (!ipGroups[entry.ipAddress]) {
        ipGroups[entry.ipAddress] = [];
      }
      ipGroups[entry.ipAddress].push(entry);
    });
    
    // Create sets of anomalous IPs from anomaly data for quick lookups
    const highTrafficIPs = new Set();
    const unusualPatternIPs = new Set();
    
    if (anomalyData && anomalyData.status === 'success') {
      // Extract high traffic IPs
      anomalyData.high_traffic_ips.forEach(item => {
        highTrafficIPs.add(item.ip_address);
      });
      
      // Extract IPs with unusual patterns
      anomalyData.unusual_patterns.forEach(item => {
        unusualPatternIPs.add(item.ip_address);
      });
      
      // Log for debugging
      console.log('Anomaly data processed:', { 
        highTrafficCount: highTrafficIPs.size, 
        unusualPatternsCount: unusualPatternIPs.size 
      });
    }
    
    // Process each IP group and map to locations
    const locationEntries = [];
    const locationsByKey = {};
    
    Object.entries(ipGroups).forEach(([ip, ipEntries]) => {
      // Get geolocation data for this IP
      const geoLocation = geoData[ip];
      
      if (geoLocation) {
        // Determine anomaly status for this IP
        const hasHighTraffic = highTrafficIPs.has(ip);
        const hasUnusualPattern = unusualPatternIPs.has(ip);
        const anomalyStatus = hasHighTraffic && hasUnusualPattern 
          ? 'critical' 
          : hasHighTraffic || hasUnusualPattern 
            ? 'warning' 
            : 'normal';
        
        // Calculate statistics for this IP
        const requestsByMethod = {};
        const requestsByPath = {};
        const statusCodes = {};
        
        ipEntries.forEach(entry => {
          // Count requests by method
          requestsByMethod[entry.method] = (requestsByMethod[entry.method] || 0) + 1;
          
          // Count requests by path
          requestsByPath[entry.path] = (requestsByPath[entry.path] || 0) + 1;
          
          // Count status codes
          statusCodes[entry.statusCode] = (statusCodes[entry.statusCode] || 0) + 1;
        });
        
        // Find most requested method
        const topMethod = Object.entries(requestsByMethod)
          .sort((a, b) => b[1] - a[1])[0];
        
        // Find most requested path
        const topPaths = Object.entries(requestsByPath)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3); // Top 3 paths
          
        // Generate a unique key for this location
        const locationKey = `${geoLocation.city}-${geoLocation.country}`;
        
        // Check if this location already exists in our results
        if (locationsByKey[locationKey]) {
          // Update existing location data
          const existingLocation = locationsByKey[locationKey];
          existingLocation.count += ipEntries.length;
          existingLocation.ips.add(ip);
          
          // Update methods count
          Object.entries(requestsByMethod).forEach(([method, count]) => {
            existingLocation.methods[method] = (existingLocation.methods[method] || 0) + count;
          });
          
          // Update paths count
          Object.entries(requestsByPath).forEach(([path, count]) => {
            existingLocation.paths[path] = (existingLocation.paths[path] || 0) + count;
          });
          
          // Update status codes
          Object.entries(statusCodes).forEach(([code, count]) => {
            existingLocation.statusCodes[code] = (existingLocation.statusCodes[code] || 0) + count;
          });
          
          // Update anomaly status (prioritize critical > warning > normal)
          if (anomalyStatus === 'critical' || 
             (anomalyStatus === 'warning' && existingLocation.anomalyStatus !== 'critical')) {
            existingLocation.anomalyStatus = anomalyStatus;
          }
          
          // Add IP to the anomalous IP lists if applicable
          if (hasHighTraffic) existingLocation.highTrafficIPs.add(ip);
          if (hasUnusualPattern) existingLocation.unusualPatternIPs.add(ip);
        } else {
          // Add new location
          const newLocation = {
            lat: geoLocation.lat,
            lng: geoLocation.lng,
            city: geoLocation.city,
            country: geoLocation.country,
            count: ipEntries.length,
            ips: new Set([ip]),
            methods: requestsByMethod,
            paths: requestsByPath,
            statusCodes,
            anomalyStatus,
            highTrafficIPs: hasHighTraffic ? new Set([ip]) : new Set(),
            unusualPatternIPs: hasUnusualPattern ? new Set([ip]) : new Set(),
            topMethod: topMethod ? topMethod[0] : null,
            topPaths
          };
          
          locationEntries.push(newLocation);
          locationsByKey[locationKey] = newLocation;
        }
      }
    });
    
    // Update all locations with their most requested methods and paths after all data is aggregated
    locationEntries.forEach(location => {
      const methodsArray = Object.entries(location.methods).sort((a, b) => b[1] - a[1]);
      location.topMethod = methodsArray.length > 0 ? methodsArray[0][0] : null;
      
      const pathsArray = Object.entries(location.paths).sort((a, b) => b[1] - a[1]);
      location.topPaths = pathsArray.slice(0, 3).map(([path, count]) => ({ path, count }));
    });
    
    console.log('Location data processed:', {
      totalLocations: locationEntries.length,
      locationsWithAnomalies: locationEntries.filter(l => l.anomalyStatus !== 'normal').length
    });
    
    setLocationData(locationEntries);
  }, [logData, geoData, anomalyData]);
  
  // Get maximum count for scaling circle sizes
  const maxCount = Math.max(...locationData.map(location => location.count), 1);
  
  // Function to get marker color based on anomaly status
  const getMarkerColor = (status) => {
    switch (status) {
      case 'critical':
        return '#ef4444'; // Bright red
      case 'warning':
        return '#f97316'; // Bright orange
      default:
        return '#3b82f6'; // Bright blue
    }
  };
  
  // Function to get marker fill opacity based on anomaly status
  const getMarkerOpacity = (status, isPulsing = false) => {
    if (isPulsing) {
      // For critical nodes, pulse the opacity between 0.5 and 0.9
      const pulseValue = 0.5 + (pulseStep / 30) * 0.4;
      return status === 'critical' ? pulseValue : getMarkerOpacity(status);
    }
    
    switch (status) {
      case 'critical':
        return 0.8;
      case 'warning':
        return 0.7;
      default:
        return 0.6;
    }
  };
  
  // Function to get marker size based on count and anomaly status
  const getMarkerRadius = (count, maxCount, status) => {
    // Base size calculation
    const baseSize = Math.max(5, Math.sqrt(count / maxCount) * 25);
    
    // Make critical markers slightly larger
    if (status === 'critical') {
      return baseSize * 1.2;
    } else if (status === 'warning') {
      return baseSize * 1.1;
    }
    
    return baseSize;
  };
  
  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Sessions by Location</h2>
        <div className="h-96 flex items-center justify-center">
          <div className="text-gray-500">Loading geolocation data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Sessions by Location</h2>
      
      <div className="h-96 relative">
        {locationData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
            <div className="text-gray-600 text-center p-4 bg-white rounded-lg shadow-md">
              <p>No location data available for the selected logs.</p>
              <p className="text-sm mt-1">This could be because the IP addresses in your logs are not in the geolocation database.</p>
            </div>
          </div>
        )}
        
        <MapContainer
          key={mapKey} // Force map to re-render when anomaly data changes
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          scrollWheelZoom={true}
          minZoom={1}
          maxZoom={18}
          zoomControl={false}
          worldCopyJump={true}
        >
          <ZoomControl position="bottomright" />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {locationData.map((location, index) => (
            <CircleMarker
              key={`${location.city}-${location.country}-${index}-${location.anomalyStatus}`}
              center={[location.lat, location.lng]}
              radius={getMarkerRadius(location.count, maxCount, location.anomalyStatus)}
              fillColor={getMarkerColor(location.anomalyStatus)}
              color={getMarkerColor(location.anomalyStatus)}
              weight={location.anomalyStatus === 'critical' ? 2 : 1.5}
              opacity={0.9}
              fillOpacity={getMarkerOpacity(location.anomalyStatus, true)}
            >
              <Tooltip>
                <div>
                  <div className="font-bold text-base border-b border-gray-300 pb-1 mb-1">
                    {location.city}, {location.country}
                    {location.anomalyStatus !== 'normal' && (
                      <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${
                        location.anomalyStatus === 'critical' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {location.anomalyStatus === 'critical' ? 'Critical' : 'Warning'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="font-medium">Requests:</div>
                    <div>{location.count}</div>
                    
                    <div className="font-medium">Unique IPs:</div>
                    <div>{location.ips.size}</div>
                    
                    <div className="font-medium">Top Method:</div>
                    <div>{location.topMethod}</div>
                    
                    {location.anomalyStatus !== 'normal' && (
                      <>
                        <div className="font-medium">Anomalies:</div>
                        <div>
                          {location.highTrafficIPs.size > 0 && (
                            <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">High Traffic</span>
                          )}
                          {location.unusualPatternIPs.size > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded ml-1">Unusual Patterns</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-2 border-t border-gray-300 pt-1">
                    <div className="font-medium text-sm">Top Requested URLs:</div>
                    <ul className="text-xs mt-1">
                      {location.topPaths.map((pathInfo, i) => (
                        <li key={i} className="truncate max-w-xs">
                          {pathInfo.path.length > 30 ? pathInfo.path.substring(0, 30) + '...' : pathInfo.path} ({pathInfo.count})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Tooltip>
              
              <Popup>
                <div className="max-w-sm">
                  <h3 className="font-bold text-base mb-2">
                    {location.city}, {location.country}
                    {location.anomalyStatus !== 'normal' && (
                      <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${
                        location.anomalyStatus === 'critical' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {location.anomalyStatus === 'critical' ? 'Critical' : 'Warning'}
                      </span>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    <div className="font-medium">Requests:</div>
                    <div>{location.count}</div>
                    
                    <div className="font-medium">Unique IPs:</div>
                    <div>{location.ips.size}</div>
                  </div>
                  
                  {location.anomalyStatus !== 'normal' && (
                    <div className="mb-3 p-2 rounded bg-gray-50">
                      <div className="font-medium text-sm mb-1">Anomaly Details:</div>
                      <div className="text-xs space-y-1">
                        {location.highTrafficIPs.size > 0 && (
                          <div>
                            <span className="font-medium">High Traffic IPs:</span> {location.highTrafficIPs.size} IP(s) with unusually high request rates
                          </div>
                        )}
                        {location.unusualPatternIPs.size > 0 && (
                          <div>
                            <span className="font-medium">Unusual Patterns:</span> {location.unusualPatternIPs.size} IP(s) with suspicious behavior patterns
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <div className="font-medium text-sm mb-1">Top Methods:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(location.methods)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([method, count], i) => (
                          <span key={i} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs">
                            {method}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-medium text-sm mb-1">Status Codes:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(location.statusCodes)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([code, count], i) => {
                          let colorClass = 'bg-gray-100 text-gray-800';
                          if (code >= 200 && code < 300) colorClass = 'bg-green-100 text-green-800';
                          else if (code >= 300 && code < 400) colorClass = 'bg-blue-100 text-blue-800';
                          else if (code >= 400 && code < 500) colorClass = 'bg-yellow-100 text-yellow-800';
                          else if (code >= 500) colorClass = 'bg-red-100 text-red-800';
                          
                          return (
                            <span key={i} className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
                              {code}: {count}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm mb-1">Top URLs:</div>
                    <ul className="text-xs space-y-1">
                      {location.topPaths.map((pathInfo, i) => (
                        <li key={i} className="truncate">
                          • {pathInfo.path} ({pathInfo.count})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
        <div>Circles represent cities with session activity. Click for detailed information.</div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1 animate-pulse" style={{backgroundColor: '#ef4444'}}></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: '#f97316'}}></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: '#3b82f6'}}></div>
            <span>Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap; 