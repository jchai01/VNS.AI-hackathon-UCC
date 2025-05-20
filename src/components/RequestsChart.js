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

  // Check if there's data to display
  const hasData = labels && labels.length > 0 && data && data.length > 0;

  // Reset zoom function
  const resetZoom = () => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartData = {
    labels: labels || [],
    datasets: [
      {
        label: 'Requests',
        data: data || [],
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
        {hasData && (
          <button 
            onClick={resetZoom}
            className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded text-sm transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>

      <div className="relative">
        {hasData ? (
          <>
            <Line ref={chartRef} data={chartData} options={options} />
            <div className="text-xs text-gray-500 mt-2 text-center">
              Tip: Use mouse wheel to zoom, drag to pan, or hold Ctrl key and drag to pan
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 text-center">No data available for the selected filters</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your date range or other filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsChart; 