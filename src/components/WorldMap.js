import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Tooltip, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Note: In a real implementation, you would use a geo-IP database to get country information
// This is a simplified mock version

const WorldMap = ({ entries }) => {
  // Mock data - in a real app, you'd use geo-IP lookup on the IP addresses
  const [countryData, setCountryData] = useState([
    { name: 'United States', code: 'US', lat: 37.0902, lng: -95.7129, count: 0 },
    { name: 'China', code: 'CN', lat: 35.8617, lng: 104.1954, count: 0 },
    { name: 'India', code: 'IN', lat: 20.5937, lng: 78.9629, count: 0 },
    { name: 'United Kingdom', code: 'GB', lat: 55.3781, lng: -3.4360, count: 0 },
    { name: 'Germany', code: 'DE', lat: 51.1657, lng: 10.4515, count: 0 },
    { name: 'France', code: 'FR', lat: 46.2276, lng: 2.2137, count: 0 },
    { name: 'Brazil', code: 'BR', lat: -14.2350, lng: -51.9253, count: 0 },
    { name: 'Japan', code: 'JP', lat: 36.2048, lng: 138.2529, count: 0 },
  ]);

  useEffect(() => {
    if (!entries || entries.length === 0) return;
    
    // Simulate distribution of IPs across countries
    // In a real implementation, you would use a geo-IP database
    const newCountryData = [...countryData];
    const totalEntries = entries.length;
    
    // Distribute entries across countries (mock distribution)
    newCountryData[0].count = Math.floor(totalEntries * 0.35); // US
    newCountryData[1].count = Math.floor(totalEntries * 0.20); // China
    newCountryData[2].count = Math.floor(totalEntries * 0.15); // India
    newCountryData[3].count = Math.floor(totalEntries * 0.10); // UK
    newCountryData[4].count = Math.floor(totalEntries * 0.08); // Germany
    newCountryData[5].count = Math.floor(totalEntries * 0.05); // France
    newCountryData[6].count = Math.floor(totalEntries * 0.04); // Brazil
    newCountryData[7].count = Math.floor(totalEntries * 0.03); // Japan
    
    setCountryData(newCountryData);
  }, [entries]);

  // Get maximum count for scaling circle sizes
  const maxCount = Math.max(...countryData.map(country => country.count));
  
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Sessions by Country</h2>
      <div className="h-96">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {countryData.map(country => (
            <CircleMarker
              key={country.code}
              center={[country.lat, country.lng]}
              radius={Math.max(5, (country.count / maxCount) * 20)}
              fillColor="#4338ca"
              color="#4338ca"
              weight={1}
              opacity={0.8}
              fillOpacity={0.6}
            >
              <Tooltip>
                <div>
                  <strong>{country.name}</strong>
                  <div>{country.count} sessions</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default WorldMap; 