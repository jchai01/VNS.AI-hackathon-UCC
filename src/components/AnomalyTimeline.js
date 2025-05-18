import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

const AnomalyTimeline = ({ anomalyData, logData }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    // Process and prepare data for timeline
    if (anomalyData && logData && logData.length > 0) {
      const processedData = processAnomalyData(anomalyData, logData);
      setTimelineData(processedData);
    }
  }, [anomalyData, logData]);

  useEffect(() => {
    if (timelineData.length > 0 && svgRef.current) {
      drawTimeline();
    }
  }, [timelineData]);

  // Process different anomaly types into timeline events
  const processAnomalyData = (anomalyData, logData) => {
    const timelineEvents = [];
    
    // Process error bursts
    if (anomalyData.error_bursts && anomalyData.error_bursts.length > 0) {
      anomalyData.error_bursts.forEach(burst => {
        // Extract date from time_period (e.g., "2023-04-17 14:30 - 14:35")
        const dateTimeParts = burst.time_period.split(' - ')[0].split(' ');
        const date = dateTimeParts[0];
        const time = dateTimeParts[1];
        
        timelineEvents.push({
          date: new Date(`${date}T${time}`),
          type: 'error_burst',
          severity: calculateSeverity(burst.z_score),
          details: burst,
          label: `${burst.error_count} errors`,
          description: burst.explanation
        });
      });
    }
    
    // Process high traffic IPs
    if (anomalyData.high_traffic_ips && anomalyData.high_traffic_ips.length > 0) {
      // For high traffic IPs, we need to estimate when they occurred
      // We'll use the most recent logs for these IPs
      anomalyData.high_traffic_ips.forEach(ip => {
        // Find logs for this IP and sort by time
        const ipLogs = logData
          .filter(log => log.ipAddress === ip.ip_address)
          .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        
        if (ipLogs.length > 0) {
          const mostRecentLog = ipLogs[0];
          timelineEvents.push({
            date: new Date(mostRecentLog.dateTime),
            type: 'high_traffic_ip',
            severity: calculateSeverity(ip.traffic_percentage / 10), // Scale percentage
            details: ip,
            label: `High traffic: ${ip.ip_address}`,
            description: ip.explanation
          });
        }
      });
    }
    
    // Process unusual patterns
    if (anomalyData.unusual_patterns && anomalyData.unusual_patterns.length > 0) {
      anomalyData.unusual_patterns.forEach(pattern => {
        // For patterns, we need to get timestamp from associated logs
        const ipLogs = logData
          .filter(log => log.ipAddress === pattern.ip_address)
          .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
          
        if (ipLogs.length > 0) {
          timelineEvents.push({
            date: new Date(ipLogs[0].dateTime),
            type: 'unusual_pattern',
            severity: pattern.confidence,
            details: pattern,
            label: `Unusual pattern: ${pattern.type.replace('unusual_', '')}`,
            description: pattern.explanation
          });
        }
      });
    }
    
    // Sort by date
    return timelineEvents.sort((a, b) => a.date - b.date);
  };
  
  // Calculate severity level (0-1) from anomaly metrics
  const calculateSeverity = (value) => {
    // Clamp value between 0 and 1
    return Math.min(1, Math.max(0, value / 5)); // Normalize z-scores, etc.
  };
  
  // Draw timeline visualization using D3
  const drawTimeline = () => {
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear previous contents
    svg.selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = svg.node().getBoundingClientRect().width;
    const height = 150;
    
    // Create scales
    const timeExtent = d3.extent(timelineData, d => d.date);
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([margin.left, width - margin.right]);
    
    // Set up axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(width > 600 ? 10 : 5)
      .tickFormat(d3.timeFormat("%b %d, %H:%M"));
    
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);
    
    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Anomaly Timeline");
    
    // Create event markers
    const eventGroup = svg.append("g");
    
    // Line for timeline
    eventGroup.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2);
    
    // Add event markers
    const events = eventGroup.selectAll(".event")
      .data(timelineData)
      .enter()
      .append("g")
      .attr("class", "event")
      .attr("transform", d => `translate(${xScale(d.date)}, ${height / 2})`);
    
    // Event circles
    events.append("circle")
      .attr("r", d => 5 + (d.severity * 5)) // Size based on severity
      .attr("fill", d => {
        // Color based on type
        if (d.type === 'error_burst') return "#ef4444"; // Red
        if (d.type === 'high_traffic_ip') return "#f59e0b"; // Amber
        return "#8b5cf6"; // Purple for unusual patterns
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d => 5 + (d.severity * 5) + 2);
        
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="font-medium">${d.label}</div>
            <div class="text-xs text-gray-500">${d.date.toLocaleString()}</div>
            <div class="mt-1 text-sm">${d.description}</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d => 5 + (d.severity * 5));
        
        tooltip
          .style("opacity", 0);
      });
    
    // Add labels for significant events (higher severity)
    events
      .filter(d => d.severity > 0.7)
      .append("text")
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text(d => d.label);
  };
  
  if (!anomalyData || !logData || logData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-medium text-gray-800">Anomaly Timeline</h2>
        </div>
        <div className="p-4 flex items-center justify-center h-40">
          <p className="text-gray-500">No anomaly data available for timeline visualization.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-medium text-gray-800">Anomaly Timeline</h2>
      </div>
      <div className="p-4">
        <div className="text-sm text-gray-600 mb-2">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span> Error Bursts
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mx-1 ml-3"></span> High Traffic IPs
          <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mx-1 ml-3"></span> Unusual Patterns
        </div>
        <svg ref={svgRef} width="100%" height="150" />
        <div 
          ref={tooltipRef} 
          className="absolute bg-white p-2 rounded shadow-lg border border-gray-200 max-w-xs z-10 text-sm pointer-events-none" 
          style={{ opacity: 0 }}
        />
        <div className="text-xs text-gray-500 mt-2">
          Hover over anomaly points for details. Point size indicates severity.
        </div>
      </div>
    </div>
  );
};

export default AnomalyTimeline; 