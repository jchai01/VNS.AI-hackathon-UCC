import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ onLogUpload }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onLogUpload(file);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onLogUpload(file);
    }
  };
  
  return (
    <nav className="bg-primary-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">
            Nginx Access Log Analyzer
          </Link>
          
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".log"
            />
            
            <div 
              className={`relative flex ${dragActive ? 'bg-primary-500' : 'bg-white'} text-primary-700 hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition-colors cursor-pointer overflow-hidden`}
              onClick={handleUploadClick}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Upload Log File
              </span>
              
              {dragActive && (
                <div className="absolute inset-0 bg-primary-600 bg-opacity-20 flex items-center justify-center">
                  <span className="text-white font-medium">Drop File Here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 