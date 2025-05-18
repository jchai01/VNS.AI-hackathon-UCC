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

const HttpMethodsChart = ({ methods }) => {
  // Color mapping for HTTP methods
  const getColorForMethod = (method) => {
    const colorMap = {
      'GET': 'rgba(54, 162, 235, 0.7)',
      'POST': 'rgba(255, 99, 132, 0.7)',
      'PUT': 'rgba(75, 192, 192, 0.7)',
      'DELETE': 'rgba(255, 159, 64, 0.7)',
      'HEAD': 'rgba(153, 102, 255, 0.7)',
      'OPTIONS': 'rgba(255, 205, 86, 0.7)',
      'PATCH': 'rgba(201, 203, 207, 0.7)',
      'CONNECT': 'rgba(100, 100, 100, 0.7)',
      'TRACE': 'rgba(128, 0, 128, 0.7)',
      'OTHER': 'rgba(169, 169, 169, 0.7)',
    };
    
    return colorMap[method] || 'rgba(128, 128, 128, 0.7)';
  };

  // Prepare data for the chart
  const labels = methods.map(m => m.method);
  const data = methods.map(m => m.hits);
  const backgroundColor = labels.map(method => getColorForMethod(method));
  
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

    const options = {    responsive: true,    maintainAspectRatio: false,    plugins: {      legend: {        position: 'right',        labels: {          boxWidth: 12,          font: {            size: 11          }        }      },      title: {        display: true,        text: 'HTTP Methods',        font: {          size: 14        }      },    },  };

    return (
      <div className="card">
        <div style={{ height: '300px', position: 'relative' }}>
          <Pie data={chartData} options={options} />
        </div>
      </div>
    );
};

export default HttpMethodsChart; 