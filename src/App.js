import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Footer from './components/Footer';

function App() {
  // State to store the parsed log data
  const [logData, setLogData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const handleLogUpload = (logFile) => {
    setIsLoading(true);
    setUploadProgress(0);
    setProcessingProgress(0);
    
    const fileSize = logFile.size;
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', logFile);
    
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
        'Accept': 'application/json',
      }
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
          throw new Error(`Server error (${response.status}): ${errorText || 'No error message provided'}`);
        }
      }
      
      setUploadProgress(100);
      // Start processing progress updates
      let progress = 0;
      const processingInterval = setInterval(() => {
        progress += 5;
        if (progress >= 99) {
          clearInterval(processingInterval);
        }
        setProcessingProgress(progress);
      }, 200);
      
      return response.json().then(data => {
        clearInterval(processingInterval);
        setProcessingProgress(100);
        return data;
      });
    })
    .then(data => {
      console.log('Received data:', data);
      setLogData(data);
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error uploading log file:', error);
      setIsLoading(false);
      alert(error.message || 'Failed to upload and process log file');
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onLogUpload={handleLogUpload} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <Dashboard 
              logData={logData} 
              isLoading={isLoading} 
              uploadProgress={uploadProgress}
              processingProgress={processingProgress}
            />
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App; 