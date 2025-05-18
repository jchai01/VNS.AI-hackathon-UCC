import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const OsDistributionChart = ({ osData }) => {
  // Color mapping for common OS
  const getColorForOS = (os) => {
    const colorMap = {
      'Windows': 'rgba(0, 120, 215, 0.7)',
      'macOS': 'rgba(167, 167, 167, 0.7)',
      'iOS': 'rgba(0, 122, 255, 0.7)',
      'Android': 'rgba(164, 198, 57, 0.7)',
      'Linux': 'rgba(255, 153, 0, 0.7)',
      'Ubuntu': 'rgba(233, 84, 32, 0.7)',
      'Debian': 'rgba(215, 10, 83, 0.7)',
      'ChromeOS': 'rgba(255, 215, 0, 0.7)',
      'Other': 'rgba(128, 128, 128, 0.7)',
    };
    
    return colorMap[os] || 'rgba(128, 128, 128, 0.7)';
  };

  // Prepare data for the chart
  const labels = osData.map(o => o.os);
  const data = osData.map(o => o.hits);
  const backgroundColor = labels.map(os => getColorForOS(os));
  
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderColor: backgroundColor.map(color => color.replace('0.7', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: true,
        text: 'Operating System Distribution',
        font: {
          size: 14
        }
      },
    },
  };

  return (
    <div className="card">
      <div style={{ height: '300px', position: 'relative' }}>
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export default OsDistributionChart; 