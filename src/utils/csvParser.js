/**
 * Utility function to fetch geolocation data from the backend
 */

// Function to load geolocation data from the backend API
export const loadGeolocationData = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/geolocation-data');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch geolocation data: ${response.status} ${response.statusText}`);
    }
    
    const geoData = await response.json();
    
    // Return data if valid, otherwise empty object
    return geoData && typeof geoData === 'object' ? geoData : {};
  } catch (error) {
    console.error('Error loading geolocation data:', error);
    return {};
  }
}; 