import React from 'react';

const TopReferrers = ({ referrers }) => {
  // Helper function to get favicon for a domain
  const getFaviconUrl = (domain) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };
  
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Top Referrers</h2>
      <div className="space-y-4">
        {referrers.length > 0 ? (
          referrers.map((item) => (
            <div key={item.referrer} className="flex items-center">
              <img 
                src={getFaviconUrl(item.referrer)} 
                alt={item.referrer} 
                className="w-5 h-5 mr-3"
                onError={(e) => { e.target.src = 'https://www.google.com/s2/favicons?domain=example.com&sz=32'; }}
              />
              <div className="flex-grow">
                <div className="text-sm font-medium text-gray-900">{item.referrer}</div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary-600 h-1.5 rounded-full" 
                    style={{ width: `${(item.hits / Math.max(...referrers.map(r => r.hits))) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="ml-4 text-sm font-semibold text-gray-700">
                {item.hits}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center py-4">No referrer data available</div>
        )}
      </div>
    </div>
  );
};

export default TopReferrers; 