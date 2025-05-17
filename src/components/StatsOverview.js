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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="card flex items-center p-6">
        <div className="rounded-full bg-indigo-100 p-3 mr-4">
          <ChartBarIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <div className="stats-value">{stats.sessions.toLocaleString()}</div>
          <div className="stats-label">Sessions</div>
        </div>
      </div>
      
      <div className="card flex items-center p-6">
        <div className="rounded-full bg-blue-100 p-3 mr-4">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <div className="stats-value">{stats.requests.toLocaleString()}</div>
          <div className="stats-label">Requests</div>
        </div>
      </div>
      
      <div className="card flex items-center p-6">
        <div className="rounded-full bg-emerald-100 p-3 mr-4">
          <ArrowsRightLeftIcon className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <div className="stats-value">{formatBytes(stats.bandwidth)}</div>
          <div className="stats-label">Transferred</div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview; 