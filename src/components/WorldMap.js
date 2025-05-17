import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Tooltip, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Enhanced mock geo-IP database with city information
const mockGeoData = [
  { ipRange: ['0.0.0.0', '30.0.0.0'], city: 'New York', country: 'United States', code: 'US', lat: 40.7128, lng: -74.006 },
  { ipRange: ['30.0.0.0', '50.0.0.0'], city: 'Los Angeles', country: 'United States', code: 'US', lat: 34.0522, lng: -118.2437 },
  { ipRange: ['50.0.0.0', '70.0.0.0'], city: 'San Francisco', country: 'United States', code: 'US', lat: 37.7749, lng: -122.4194 },
  { ipRange: ['70.0.0.0', '90.0.0.0'], city: 'Chicago', country: 'United States', code: 'US', lat: 41.8781, lng: -87.6298 },
  { ipRange: ['90.0.0.0', '120.0.0.0'], city: 'Beijing', country: 'China', code: 'CN', lat: 39.9042, lng: 116.4074 },
  { ipRange: ['120.0.0.0', '130.0.0.0'], city: 'Shanghai', country: 'China', code: 'CN', lat: 31.2304, lng: 121.4737 },
  { ipRange: ['130.0.0.0', '140.0.0.0'], city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lng: 139.6503 },
  { ipRange: ['140.0.0.0', '150.0.0.0'], city: 'London', country: 'United Kingdom', code: 'GB', lat: 51.5074, lng: -0.1278 },
  { ipRange: ['150.0.0.0', '160.0.0.0'], city: 'Berlin', country: 'Germany', code: 'DE', lat: 52.5200, lng: 13.4050 },
  { ipRange: ['160.0.0.0', '170.0.0.0'], city: 'Paris', country: 'France', code: 'FR', lat: 48.8566, lng: 2.3522 },
  { ipRange: ['170.0.0.0', '180.0.0.0'], city: 'Mumbai', country: 'India', code: 'IN', lat: 19.0760, lng: 72.8777 },
  { ipRange: ['180.0.0.0', '190.0.0.0'], city: 'Delhi', country: 'India', code: 'IN', lat: 28.6139, lng: 77.2090 },
  { ipRange: ['190.0.0.0', '200.0.0.0'], city: 'São Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lng: -46.6333 },
  { ipRange: ['200.0.0.0', '255.255.255.255'], city: 'Sydney', country: 'Australia', code: 'AU', lat: -33.8688, lng: 151.2093 },
];

const WorldMap = ({ entries }) => {
  const [locationData, setLocationData] = useState([]);
  
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    
    // Group entries by IP and analyze each group
    const ipGroups = {};
    
    entries.forEach(entry => {
      if (!ipGroups[entry.ipAddress]) {
        ipGroups[entry.ipAddress] = [];
      }
      ipGroups[entry.ipAddress].push(entry);
    });
    
    // Assign each IP to a city based on our mock geo database
    const locationEntries = [];
    
    Object.entries(ipGroups).forEach(([ip, ipEntries]) => {
      // Convert IP to a number for range comparison (simplified)
      const ipParts = ip.split('.');
      const ipNum = (
        parseInt(ipParts[0] || 0) * 16777216 + 
        parseInt(ipParts[1] || 0) * 65536 + 
        parseInt(ipParts[2] || 0) * 256 + 
        parseInt(ipParts[3] || 0)
      );
      
      // Find matching geo location from our mock data
      const geoLocation = mockGeoData.find(geo => {
        const minIpParts = geo.ipRange[0].split('.');
        const maxIpParts = geo.ipRange[1].split('.');
        
        const minIpNum = (
          parseInt(minIpParts[0] || 0) * 16777216 + 
          parseInt(minIpParts[1] || 0) * 65536 + 
          parseInt(minIpParts[2] || 0) * 256 + 
          parseInt(minIpParts[3] || 0)
        );
        
        const maxIpNum = (
          parseInt(maxIpParts[0] || 0) * 16777216 + 
          parseInt(maxIpParts[1] || 0) * 65536 + 
          parseInt(maxIpParts[2] || 0) * 256 + 
          parseInt(maxIpParts[3] || 0)
        );
        
        return ipNum >= minIpNum && ipNum <= maxIpNum;
      });
      
      if (geoLocation) {
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
          
        // Check if this location already exists in our result
        const existingLocation = locationEntries.find(
          loc => loc.city === geoLocation.city && loc.country === geoLocation.country
        );
        
        if (existingLocation) {
          // Update existing location data
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
        } else {
          // Add new location
          locationEntries.push({
            ...geoLocation,
            count: ipEntries.length,
            ips: new Set([ip]),
            methods: requestsByMethod,
            paths: requestsByPath,
            statusCodes,
            topMethod: topMethod ? topMethod[0] : null,
            topPaths
          });
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
    
    setLocationData(locationEntries);
  }, [entries]);
  
  // Get maximum count for scaling circle sizes
  const maxCount = Math.max(...locationData.map(location => location.count), 1);
  
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Sessions by Location</h2>
      <div className="h-96">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {locationData.map((location, index) => (
            <CircleMarker
              key={`${location.city}-${index}`}
              center={[location.lat, location.lng]}
              radius={Math.max(5, Math.sqrt(location.count / maxCount) * 25)}
              fillColor="#4338ca"
              color="#4338ca"
              weight={1}
              opacity={0.8}
              fillOpacity={0.6}
            >
              <Tooltip>
                <div>
                  <div className="font-bold text-base border-b border-gray-300 pb-1 mb-1">
                    {location.city}, {location.country}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="font-medium">Sessions:</div>
                    <div>{location.count}</div>
                    
                    <div className="font-medium">Unique IPs:</div>
                    <div>{location.ips.size}</div>
                    
                    <div className="font-medium">Top Method:</div>
                    <div>{location.topMethod}</div>
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
                  <h3 className="font-bold text-base mb-2">{location.city}, {location.country}</h3>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    <div className="font-medium">Sessions:</div>
                    <div>{location.count}</div>
                    
                    <div className="font-medium">Unique IPs:</div>
                    <div>{location.ips.size}</div>
                  </div>
                  
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
      <div className="text-xs text-gray-500 mt-2 text-center">
        Circles represent cities with session activity. Click for detailed information.
      </div>
    </div>
  );
};

export default WorldMap; 