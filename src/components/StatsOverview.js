import React from 'react';
import { ChartBarIcon, UserGroupIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

const StatsOverview = ({ stats }) => {
  // Helper function to format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <>
      <div className="card flex items-center p-6 w-full">
        <div className="rounded-full bg-indigo-100 p-3 mr-4 flex-shrink-0">
          <ChartBarIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold text-gray-900 truncate">{stats.sessions.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Sessions</div>
        </div>
      </div>
      
      <div className="card flex items-center p-6 w-full">
        <div className="rounded-full bg-blue-100 p-3 mr-4 flex-shrink-0">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold text-gray-900 truncate">{stats.requests.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Requests</div>
        </div>
      </div>
      
      <div className="card flex items-center p-6 w-full">
        <div className="rounded-full bg-emerald-100 p-3 mr-4 flex-shrink-0">
          <ArrowsRightLeftIcon className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold text-gray-900 truncate">{formatBytes(stats.bandwidth)}</div>
          <div className="text-sm text-gray-500">Transferred</div>
        </div>
      </div>
    </>
  );
};

export default StatsOverview; 