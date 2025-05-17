import React from 'react';
import { Doughnut } from 'react-chartjs-2';
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

const DeviceChart = ({ devices }) => {
  const deviceNames = devices.map(d => d.device);
  const deviceCounts = devices.map(d => d.hits);
  
  // Color palette for the chart
  const backgroundColors = [
    'rgba(99, 102, 241, 0.7)',
    'rgba(239, 68, 68, 0.7)',
    'rgba(16, 185, 129, 0.7)',
  ];
  
  const chartData = {
    labels: deviceNames,
    datasets: [
      {
        data: deviceCounts,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Sessions by Device Type',
      },
    },
  };

  return (
    <div className="card">
      <Doughnut data={chartData} options={options} />
      <div className="mt-4 space-y-2">
        {devices.map((device, index) => (
          <div key={device.device} className="flex items-center">
            <span 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: backgroundColors[index] }}
            ></span>
            <div className="flex justify-between w-full">
              <span>{device.device}</span>
              <span className="font-semibold">
                {((device.hits / deviceCounts.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceChart; 