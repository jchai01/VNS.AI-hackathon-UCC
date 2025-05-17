import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const BrowserChart = ({ browsers }) => {
  // Sort browsers by hits in descending order
  const sortedBrowsers = [...browsers].sort((a, b) => b.hits - a.hits);
  
  // Check if "Other" or "Others" exists in the data
  const otherIndex = sortedBrowsers.findIndex(b => 
    b.browser === 'Other' || b.browser === 'Others');
  
  // Remove any existing "Other"/"Others" entries to combine them later
  let existingOtherHits = 0;
  if (otherIndex !== -1) {
    existingOtherHits = sortedBrowsers[otherIndex].hits;
    sortedBrowsers.splice(otherIndex, 1);
  }
  
  // Get the top browsers (excluding any "Other"/"Others" we found)
  const topBrowsers = sortedBrowsers.slice(0, 3);
  
  // Calculate the sum for "Others" (browsers beyond the top 4 + any existing "Others")
  const otherBrowsers = sortedBrowsers.slice(3);
  const othersTotal = otherBrowsers.reduce((sum, b) => sum + b.hits, 0) + existingOtherHits;
  
  // Create labels and data arrays for the chart
  const labels = [...topBrowsers.map(b => b.browser)];
  const data = [...topBrowsers.map(b => b.hits)];
  
  // Add "Others" category to chart if there are other browsers
  if (othersTotal > 0) {
    labels.push('Others');
    data.push(othersTotal);
  }
  
  
  // Color mapping for common browsers
  const getColorForBrowser = (browser) => {
    const colorMap = {
      'Chrome': 'rgba(66, 133, 244, 0.7)',
      'Firefox': 'rgba(255, 117, 24, 0.7)',
      'Safari': 'rgba(0, 122, 255, 0.7)',
      'Edge': 'rgba(0, 183, 195, 0.7)',
      'Opera': 'rgba(255, 0, 0, 0.7)',
      'Internet Explorer': 'rgba(0, 120, 215, 0.7)',
      'Others': 'rgba(128, 128, 128, 0.7)',
    };
    
    return colorMap[browser] || 'rgba(128, 128, 128, 0.7)';
  };
  
  const backgroundColor = labels.map(name => getColorForBrowser(name));
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sessions',
        data,
        backgroundColor,
        borderColor: backgroundColor.map(color => color.replace('0.7', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Sessions by Browser',
      },
      tooltip: {
        callbacks: {
          // Custom tooltip for "Others" category
          afterBody: (tooltipItems) => {
            const label = tooltipItems[0].label;
            
            if (label === 'Others' && otherBrowsers.length > 0) {
              // Sort other browsers and show all browsers in the "Others" category
              const sortedOthers = [...otherBrowsers].sort((a, b) => b.hits - a.hits);
              
              return [
                'Browsers in Others:',
                ...sortedOthers.map(b => `${b.browser}: ${b.hits}`)
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="card">
      <Bar data={chartData} options={options} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {/* Display the top 4 browsers */}
        {topBrowsers.map((browser, index) => (
          <div key={browser.browser} className="flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: getColorForBrowser(browser.browser) }}
            ></span>
            <span className="truncate">{browser.browser}</span>
            <span className="ml-auto font-semibold">{browser.hits}</span>
          </div>
        ))}
        
        {/* Show Others entry if there are more than 4 browsers */}
        {othersTotal > 0 && (
          <div key="others" className="flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: getColorForBrowser('Others') }}
            ></span>
            <span className="truncate">Others</span>
            <span className="ml-auto font-semibold">{othersTotal}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserChart; 