import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Footer from './components/Footer';
import { parse } from 'date-fns';

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
    let loadedBytes = 0;
    
    const reader = new FileReader();
    
    // Track file reading progress
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        loadedBytes = event.loaded;
        const progress = Math.round((loadedBytes / fileSize) * 100);
        setUploadProgress(progress);
      }
    };
    
    reader.onload = (e) => {
      const content = e.target.result;
      
      // Set upload to 100% when file is fully loaded
      setUploadProgress(100);
      
      // Start processing the log file
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const totalLines = lines.length;
      
      // Process the logs in chunks to provide progress feedback
      const processInChunks = (startIndex, chunkSize) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const endIndex = Math.min(startIndex + chunkSize, totalLines);
            const chunk = lines.slice(startIndex, endIndex);
            
            // Process this chunk of lines
            const parsedChunk = parseNginxLogChunk(chunk);
            
            // Update progress
            const progress = Math.round((endIndex / totalLines) * 100);
            setProcessingProgress(progress);
            
            resolve({
              parsedEntries: parsedChunk,
              nextIndex: endIndex
            });
          }, 0);
        });
      };
      
      // Process all chunks sequentially
      const processAllChunks = async () => {
        const chunkSize = 500; // Process 500 lines at a time
        let currentIndex = 0;
        let allParsedEntries = [];
        
        while (currentIndex < totalLines) {
          const result = await processInChunks(currentIndex, chunkSize);
          allParsedEntries = [...allParsedEntries, ...result.parsedEntries];
          currentIndex = result.nextIndex;
        }
        
        // All processing is done
        const finalData = {
          fileName: logFile.name,
          entries: allParsedEntries,
          totalRequests: allParsedEntries.length,
          uniqueVisitors: new Set(allParsedEntries.map(entry => entry.ipAddress)).size,
          totalBandwidth: allParsedEntries.reduce((sum, entry) => sum + entry.bytes, 0),
        };
        
        setLogData(finalData);
        setIsLoading(false);
      };
      
      processAllChunks();
    };
    
    reader.readAsText(logFile);
  };
  
  // Parse a chunk of Nginx log lines
  const parseNginxLogChunk = (lines) => {
    // Nginx log format regex (customized for standard Nginx log format)
    const logRegex = /^(\S+) - (\S+) \[(.*?)\] "(\S+) (.*?) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;
    
    const parsedEntries = [];
    
    lines.forEach(line => {
      const match = line.match(logRegex);
      if (match) {
        const [
          , ipAddress, user, dateTime, method, path, httpVersion, 
          statusCode, bytes, referer, userAgent
        ] = match;
        
        // Parse date in format "17/Apr/2025:05:10:56 +0100"
        const datePattern = /(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) (\+\d+)/;
        const dateMatch = dateTime.match(datePattern);
        
        let parsedDate;
        
        if (dateMatch) {
          const [, day, month, year, hour, minute, second] = dateMatch;
          const dateStr = `${day} ${month} ${year} ${hour}:${minute}:${second}`;
          parsedDate = parse(dateStr, 'dd MMM yyyy HH:mm:ss', new Date());
        } else {
          // Fallback to the original date parsing if format doesn't match
          parsedDate = new Date(dateTime.replace(':', ' ', 1));
        }
        
        parsedEntries.push({
          ipAddress,
          dateTime: parsedDate,
          method,
          path,
          statusCode: parseInt(statusCode),
          bytes: parseInt(bytes),
          referer: referer !== '-' ? referer : null,
          userAgent
        });
      }
    });
    
    return parsedEntries;
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