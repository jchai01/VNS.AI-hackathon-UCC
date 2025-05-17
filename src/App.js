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
    fetch('http://localhost:5000/api/parse-log', {
      method: 'POST',
      body: formData,
      onUploadProgress: uploadProgressHandler,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
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
      setLogData(data);
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error uploading log file:', error);
      setIsLoading(false);
      alert('Failed to upload and process log file');
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