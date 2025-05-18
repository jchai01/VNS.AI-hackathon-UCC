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
        return `${year}-${month}-${day}`;
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

      // Update filters while preserving existing values if AI doesn't provide new ones
      const newFilters = {
        dateFrom: jsonData.date_from || filters.dateFrom,
        dateTo: jsonData.date_to || filters.dateTo,
        method: (jsonData.method || '').toUpperCase(),
        path: jsonData.path || filters.path,
        statusCode: jsonData.status_code ? String(jsonData.status_code) : filters.statusCode,
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
  }, [filters]);
  
  const handleLogUpload = (logFile) => {
    setIsLoading(true);
    setUploadProgress(0);
    setProcessingProgress(0);

    const fileSize = logFile.size;

    // Create FormData
    const formData = new FormData();
    formData.append("file", logFile);

    // Upload progress handler
    const uploadProgressHandler = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };
    
    // Send the file to the backend
    fetch('http://localhost:5001/api/parse-log', {
      method: 'POST',
      body: formData,
      mode: 'cors',
      headers: {
        Accept: "application/json",
      },
    })
    .then(async response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Failed to upload file');
        } catch (e) {
          throw new Error(errorText || 'Failed to upload file');
        }
      }
      
      return response.json();
    })
    .then(data => {
      setLogData(data);
      setProcessingProgress(100);
    })
    .catch(error => {
      console.error('Error:', error);
      alert(error.message);
    })
    .finally(() => {
      setIsLoading(false);
    });
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onFileUpload={handleLogUpload} />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <Dashboard 
              logData={logData} 
              isLoading={isLoading} 
              uploadProgress={uploadProgress} 
              processingProgress={processingProgress}
              filters={filters}
              setFilters={setFilters}
            />
          } />
        </Routes>
      </main>
      <Chat onAIResponse={handleAIResponse} onFilterChange={setFilters} />
      <Footer />
    </div>
  );
}

export default App;
