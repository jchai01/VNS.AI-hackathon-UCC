import React from 'react';
import { ChartBarIcon, UserGroupIcon, ArrowsRightLeftIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const StatsOverview = ({ stats }) => {
  // Check if we have valid stats data
  const hasValidData = stats && stats.sessions != null && stats.requests != null && stats.bandwidth != null;
  
  // Check if all stats are zero
  const hasZeroData = hasValidData && stats.sessions === 0 && stats.requests === 0 && stats.bandwidth === 0;

  // Helper function to format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (hasZeroData) {
    return (
      <div className="card p-6 w-full bg-yellow-50">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <div>
            <h3 className="font-medium text-yellow-800 text-lg">No data matches your current filters</h3>
            <p className="text-yellow-700 text-sm mt-1">Please adjust your date range or other filter criteria.</p>
          </div>
        </div>
      </div>
    );
  }
  
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