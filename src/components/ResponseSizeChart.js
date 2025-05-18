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

const ResponseSizeChart = ({ sizeData }) => {
  // Prepare data for the chart
  const labels = sizeData.map(item => item.category);
  const data = sizeData.map(item => item.count);
  
  // Define color gradient for size categories
  const backgroundColor = 'rgba(75, 192, 192, 0.7)';
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Response Size',
        data,
        backgroundColor,
        borderColor: backgroundColor.replace('0.7', '1'),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Response Size Distribution',
        font: {
          size: 14
        }
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
      <div style={{ height: '300px', position: 'relative' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ResponseSizeChart; 