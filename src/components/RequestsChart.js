import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  zoomPlugin
);

const RequestsChart = ({ labels, data, timeInterval }) => {
  const chartRef = useRef(null);

  // Reset zoom function
  const resetZoom = () => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Requests',
        data: data,
        fill: false,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Requests Over Time',
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Requests Over Time</h2>
        <button 
          onClick={resetZoom}
          className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded text-sm transition-colors"
        >
          Reset Zoom
        </button>
      </div>

      <div className="relative">
        <Line ref={chartRef} data={chartData} options={options} />
        <div className="text-xs text-gray-500 mt-2 text-center">
          Tip: Use mouse wheel to zoom, drag to pan, or hold Ctrl key and drag to pan
        </div>
      </div>
    </div>
  );
};

export default RequestsChart; 