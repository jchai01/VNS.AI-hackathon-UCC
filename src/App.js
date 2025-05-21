import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Footer from './components/Footer';
import Chat from './components/Chat';

function App() {
  // State to store the parsed log data
  const [logData, setLogData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Add filter state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    method: '',
    path: '',
    statusCode: '',
    browser: ''
  });

  // Function to format date from AI response to HTML input format (YYYY-MM-DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    try {
      // If already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // If in DD/MM/YYYY format
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try parsing as a regular date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return ''; // Invalid date
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Function to update filters from AI response
  const handleAIResponse = useCallback((response) => {
    try {
      console.log('handleAIResponse called with:', response);
      
      // If response is a string that looks like JSON, parse it
      let jsonData;
      if (typeof response === 'string') {
        if (response.trim().startsWith('{')) {
          try {
            jsonData = JSON.parse(response);
            console.log('Parsed JSON data:', jsonData);
          } catch (e) {
            console.error('Failed to parse JSON response:', e);
            return;
          }
        } else {
          console.log('Not a JSON string, ignoring');
          return;
        }
      } else if (typeof response === 'object') {
        jsonData = response;
        console.log('Response is already an object:', jsonData);
      } else {
        console.log('Invalid response type, ignoring');
        return;
      }
      
      // Check if we need to preserve exact format (for default dates)
      const preserveExactFormat = jsonData._exact_format === true;
      
      // Validate dates - but allow specific default dates
      let dateFrom = jsonData.date_from;
      let dateTo = jsonData.date_to;
      
      // Only format dates if we're not preserving exact format
      if (!preserveExactFormat) {
        dateFrom = jsonData.date_from ? formatDate(jsonData.date_from) : filters.dateFrom;
        dateTo = jsonData.date_to ? formatDate(jsonData.date_to) : filters.dateTo;
      }
      
      // Check if these are our default dates (17/04/2025 to 02/05/2025)
      const isDefaultDateFrom = jsonData.date_from === "17/04/2025";
      const isDefaultDateTo = jsonData.date_to === "02/05/2025";
      
      const currentDate = new Date();
      const formattedCurrentDate = currentDate.toISOString().split('T')[0];
      
      // If dates are in the future but not our defaults, limit to current date
      if (!preserveExactFormat && dateFrom > formattedCurrentDate && !isDefaultDateFrom) {
        console.warn(`Date from ${dateFrom} is in the future, using current date instead`);
        dateFrom = '';
      }
      
      if (!preserveExactFormat && dateTo > formattedCurrentDate && !isDefaultDateTo) {
        console.warn(`Date to ${dateTo} is in the future, using current date instead`);
        dateTo = '';
      }
      
      // Validate status code
      let statusCode = jsonData.status_code ? String(jsonData.status_code) : filters.statusCode;
      
      // Common HTTP status codes
      const commonStatusCodes = ['200', '201', '301', '302', '400', '401', '403', '404', '500', '502', '503'];
      
      if (statusCode && !commonStatusCodes.includes(statusCode) && statusCode !== '-1') {
        console.warn(`Status code ${statusCode} is uncommon, using empty value instead`);
        statusCode = '';
      }

      // Update filters while preserving existing values if AI doesn't provide new ones
      const newFilters = {
        ...filters, // Keep existing filters
        dateFrom: dateFrom,
        dateTo: dateTo,
        method: jsonData.method ? jsonData.method.toUpperCase() : filters.method,
        path: jsonData.path || filters.path,
        statusCode: statusCode,
        browser: jsonData.browser || filters.browser
      };

      console.log('Current filters:', filters);
      console.log('New filters:', newFilters);

      // Only update if there are actual changes
      if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
        console.log('Filters are different, updating state with:', newFilters);
        setFilters(newFilters);
      } else {
        console.log('No changes in filters, skipping update');
      }
    } catch (error) {
      console.error('Error in handleAIResponse:', error);
    }
  }, [filters, formatDate]);
  
  const handleLogUpload = (logFile) => {
    setIsLoading(true);
    setUploadProgress(0);
    setProcessingProgress(0);

    const fileSize = logFile.size;

    // Create FormData
    const formData = new FormData();
    formData.append("file", logFile);

    // Create a new XMLHttpRequest to handle upload progress
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log('Upload progress:', progress);
        setUploadProgress(progress);
      }
    });
    
    // Set up the request
    xhr.open('post', `${process.env.REACT_APP_BACKEND_URL}/api/parse-log`, true);
    xhr.setRequestHeader('Accept', 'application/json');
    
    // Handle completion
    xhr.onload = async () => {
      if (xhr.status === 200) {
        try {
          setUploadProgress(100); // Ensure upload shows as complete
          
          // Start processing progress simulation
          let processingProgress = 0;
          const processingInterval = setInterval(() => {
            processingProgress += 5;
            if (processingProgress > 95) {
              clearInterval(processingInterval);
            } else {
              setProcessingProgress(processingProgress);
            }
          }, 200);
          
          const data = JSON.parse(xhr.responseText);
          console.log('Upload complete, processing data');
          
          // Clear interval and set to 100% when done
          clearInterval(processingInterval);
          setProcessingProgress(100);
          
          setLogData(data);
        } catch (error) {
          console.error('Error parsing response:', error);
          alert('Failed to process the log file');
        }
      } else {
        console.error('Server error:', xhr.status, xhr.responseText);
        try {
          const errorJson = JSON.parse(xhr.responseText);
          alert(errorJson.error || 'Failed to upload file');
        } catch (e) {
          alert(xhr.responseText || 'Failed to upload file');
        }
      }
      setIsLoading(false);
    };
    
    // Handle errors
    xhr.onerror = () => {
      console.error('Network error occurred');
      alert('Network error occurred. Please check your connection.');
      setIsLoading(false);
    };
    
    // Send the request
    xhr.send(formData);
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onFileUpload={handleLogUpload} />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Routes>
          {/* path set to /VNS.AI-hackathon-UCC instead of / so that it matches Github Pages hosting url */}
          <Route path="/VNS.AI-hackathon-UCC" element={
            <Dashboard 
              logData={logData} 
              isLoading={isLoading} 
              uploadProgress={uploadProgress} 
              processingProgress={processingProgress}
              filters={filters}
            />
          } />
        </Routes>
      </main>
      {/* Only show Chat component if log data is loaded */}
      {logData && (
        <Chat onAIResponse={handleAIResponse} onFilterChange={setFilters} />
      )}
      <Footer />
    </div>
  );
}

export default App;
