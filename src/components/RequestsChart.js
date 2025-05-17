import React, { useState, useEffect, useRef } from 'react';
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
import { format } from 'date-fns';
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

const RequestsChart = ({ labels, data, logData }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeInterval, setTimeInterval] = useState('hourly');
  const [filteredChartData, setFilteredChartData] = useState({ labels, data });
  const [dateRange, setDateRange] = useState({
    min: '',
    max: ''
  });
  const chartRef = useRef(null);

  // Set initial date range based on log data
  useEffect(() => {
    if (logData && logData.entries && logData.entries.length > 0) {
      // Sort entries by date
      const sortedEntries = [...logData.entries].sort((a, b) => 
        a.dateTime.getTime() - b.dateTime.getTime()
      );
      
      const firstDate = sortedEntries[0].dateTime;
      const lastDate = sortedEntries[sortedEntries.length - 1].dateTime;
      
      // Format dates for input elements
      const firstDateStr = format(firstDate, 'yyyy-MM-dd');
      const lastDateStr = format(lastDate, 'yyyy-MM-dd');
      
      setDateRange({
        min: firstDateStr,
        max: lastDateStr
      });
      
      setStartDate(firstDateStr);
      setEndDate(lastDateStr);
    }
  }, [logData]);

  // Update chart data when filters change
  useEffect(() => {
    if (!logData || !logData.entries || !startDate || !endDate) {
      setFilteredChartData({ labels, data });
      return;
    }

    // Convert string dates to Date objects for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);

    // Filter entries by date range
    const filteredEntries = logData.entries.filter(entry => {
      const entryDate = new Date(entry.dateTime);
      return entryDate >= startDateTime && entryDate <= endDateTime;
    });

    // Group data by interval (hourly, daily, weekly)
    let groupedData = {};
    let formatString = '';

    if (timeInterval === 'hourly') {
      groupedData = groupByHour(filteredEntries);
      formatString = 'HH:00';
    } else if (timeInterval === 'daily') {
      groupedData = groupByDay(filteredEntries);
      formatString = 'MMM dd';
    } else {
      groupedData = groupByHour(filteredEntries);
      formatString = 'HH:00';
    }

    // Generate chart data from grouped data
    const newLabels = Object.keys(groupedData).sort();
    const newData = newLabels.map(key => groupedData[key]);

    setFilteredChartData({
      labels: newLabels,
      data: newData
    });
  }, [startDate, endDate, timeInterval, logData, labels, data]);

  // Group entries by hour
  const groupByHour = (entries) => {
    const hourCounts = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.dateTime);
      const key = format(date, 'yyyy-MM-dd HH:00');
      hourCounts[key] = (hourCounts[key] || 0) + 1;
    });
    
    return hourCounts;
  };

  // Group entries by day
  const groupByDay = (entries) => {
    const dayCounts = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.dateTime);
      const key = format(date, 'yyyy-MM-dd');
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    
    return dayCounts;
  };

  // Create human-readable labels from date keys
  const formatLabels = (dateKeys) => {
    return dateKeys.map(key => {
      const date = new Date(key);
      return timeInterval === 'hourly' ? format(date, 'HH:00') : format(date, 'MMM dd');
    });
  };

  // Reset zoom function
  const resetZoom = () => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartData = {
    labels: formatLabels(filteredChartData.labels),
    datasets: [
      {
        label: 'Requests',
        data: filteredChartData.data,
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-semibold">Requests Over Time</h2>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="startDate" className="text-sm text-gray-600">From:</label>
            <input 
              type="date" 
              id="startDate"
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="endDate" className="text-sm text-gray-600">To:</label>
            <input 
              type="date" 
              id="endDate"
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              value={timeInterval}
              onChange={(e) => setTimeInterval(e.target.value)}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <button 
            onClick={resetZoom}
            className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded text-sm transition-colors"
          >
            Reset Zoom
          </button>
        </div>
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