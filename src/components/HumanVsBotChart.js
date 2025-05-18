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

const HumanVsBotChart = ({ trafficData }) => {
  // Prepare data for the chart
  const labels = trafficData.map(item => item.type);
  const data = trafficData.map(item => item.hits);
  
  // Colors for human vs bot
  const backgroundColor = [
    'rgba(54, 162, 235, 0.7)', // Human - blue
    'rgba(255, 99, 132, 0.7)',  // Bot - red
  ];
  
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
        text: 'Human vs Bot Traffic',
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

export default HumanVsBotChart; 