import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p>VS Log Analyzer &copy; {new Date().getFullYear()}</p>
        <p className="text-sm text-gray-400 mt-1">
          A React-based viewer for analyzing Nginx access logs
        </p>
      </div>
    </footer>
  );
};

export default Footer; 