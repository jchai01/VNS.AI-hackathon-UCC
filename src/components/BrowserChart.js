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
  const browserNames = browsers.map(b => b.browser);
  const browserCounts = browsers.map(b => b.hits);
  
  // Color mapping for common browsers
  const getColorForBrowser = (browser) => {
    const colorMap = {
      'Chrome': 'rgba(66, 133, 244, 0.7)',
      'Firefox': 'rgba(255, 117, 24, 0.7)',
      'Safari': 'rgba(0, 122, 255, 0.7)',
      'Edge': 'rgba(0, 183, 195, 0.7)',
      'Opera': 'rgba(255, 0, 0, 0.7)',
      'Internet Explorer': 'rgba(0, 120, 215, 0.7)',
    };
    
    return colorMap[browser] || 'rgba(128, 128, 128, 0.7)';
  };
  
  const backgroundColor = browserNames.map(name => getColorForBrowser(name));
  
  const chartData = {
    labels: browserNames,
    datasets: [
      {
        label: 'Sessions',
        data: browserCounts,
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
        {browsers.slice(0, 6).map((browser, index) => (
          <div key={browser.browser} className="flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: getColorForBrowser(browser.browser) }}
            ></span>
            <span className="truncate">{browser.browser}</span>
            <span className="ml-auto font-semibold">{browser.hits}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowserChart; 