import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const AnomalyCorrelationMatrix = ({ anomalyData, logData }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    if (anomalyData && 
        anomalyData.status === 'success' && 
        (anomalyData.error_bursts.length > 0 || 
         anomalyData.high_traffic_ips.length > 0 || 
         anomalyData.unusual_patterns.length > 0)) {
      drawCorrelationMatrix();
    }
  }, [anomalyData, logData]);
  
  const drawCorrelationMatrix = () => {
    if (!anomalyData || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear previous content
    svg.selectAll("*").remove();
    
    // Extract IPs from all anomaly types
    const ipSet = new Set();
    
    anomalyData.error_bursts.forEach(burst => {
      // For error bursts, we need to extract IPs from the logs
      if (logData && burst.time_period) {
        // Parse the time period
        const timeParts = burst.time_period.split(' - ')[0].split(' ');
        if (timeParts.length >= 2) {
          const dateStr = timeParts[0];
          const timeStr = timeParts[1];
          const burstStartTime = new Date(`${dateStr}T${timeStr}`);
          const burstEndTime = new Date(burstStartTime.getTime() + 5 * 60000); // 5 minutes window
          
          // Find all IPs involved in this time period
          const involvedLogs = logData.filter(log => {
            const logTime = new Date(log.dateTime);
            return logTime >= burstStartTime && logTime <= burstEndTime && log.statusCode >= 400;
          });
          
          involvedLogs.forEach(log => ipSet.add(log.ipAddress));
        }
      }
    });
    
    anomalyData.high_traffic_ips.forEach(ip => {
      ipSet.add(ip.ip_address);
    });
    
    anomalyData.unusual_patterns.forEach(pattern => {
      ipSet.add(pattern.ip_address);
    });
    
    // Convert to array and limit to top 10 if too many
    let ips = Array.from(ipSet);
    if (ips.length > 10) {
      ips = ips.slice(0, 10);
    }
    
    // Define anomaly types
    const anomalyTypes = ['Error Bursts', 'High Traffic', 'Unusual Patterns'];
    
    // Build correlation matrix data
    const matrixData = [];
    
    ips.forEach(ip => {
      // Check if IP is involved in error bursts
      const inErrorBursts = anomalyData.error_bursts.some(burst => {
        // Similar logic as above to find IPs in error bursts
        if (logData && burst.time_period) {
          const timeParts = burst.time_period.split(' - ')[0].split(' ');
          if (timeParts.length >= 2) {
            const dateStr = timeParts[0];
            const timeStr = timeParts[1];
            const burstStartTime = new Date(`${dateStr}T${timeStr}`);
            const burstEndTime = new Date(burstStartTime.getTime() + 5 * 60000);
            
            const involvedLogs = logData.filter(log => {
              const logTime = new Date(log.dateTime);
              return logTime >= burstStartTime && logTime <= burstEndTime && 
                     log.statusCode >= 400 && log.ipAddress === ip;
            });
            
            return involvedLogs.length > 0;
          }
        }
        return false;
      });
      
      // Check if IP is in high traffic list
      const inHighTraffic = anomalyData.high_traffic_ips.some(item => item.ip_address === ip);
      
      // Check if IP is in unusual patterns
      const inUnusualPatterns = anomalyData.unusual_patterns.some(pattern => pattern.ip_address === ip);
      
      // Add to matrix data
      anomalyTypes.forEach((type, typeIndex) => {
        let value = 0;
        let details = 'No correlation';
        
        if (typeIndex === 0 && inErrorBursts) {
          value = 1;
          details = 'IP involved in error bursts';
        } else if (typeIndex === 1 && inHighTraffic) {
          value = 1;
          const htIP = anomalyData.high_traffic_ips.find(item => item.ip_address === ip);
          details = `High traffic IP: ${htIP.request_count} requests, ${htIP.traffic_percentage.toFixed(2)}% of traffic`;
        } else if (typeIndex === 2 && inUnusualPatterns) {
          value = 1;
          const pattern = anomalyData.unusual_patterns.find(p => p.ip_address === ip);
          details = `Unusual pattern: ${pattern.type.replace('unusual_', '')}`;
        }
        
        matrixData.push({
          ip,
          type,
          value,
          details
        });
      });
    });
    
    // If no correlation data, show a message
    if (matrixData.length === 0) {
      svg.append("text")
        .attr("x", svg.attr("width") / 2)
        .attr("y", svg.attr("height") / 2)
        .attr("text-anchor", "middle")
        .text("No correlation data available");
      return;
    }
    
    // Set up dimensions
    const margin = { top: 50, right: 50, bottom: 50, left: 120 };
    const width = svg.node().getBoundingClientRect().width;
    const height = 300;
    const cellSize = Math.min(
      (width - margin.left - margin.right) / anomalyTypes.length, 
      (height - margin.top - margin.bottom) / ips.length
    );
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(anomalyTypes)
      .range([margin.left, margin.left + anomalyTypes.length * cellSize]);
    
    const yScale = d3.scaleBand()
      .domain(ips)
      .range([margin.top, margin.top + ips.length * cellSize]);
    
    const colorScale = d3.scaleLinear()
      .domain([0, 1])
      .range(["#f7f7f7", "#2563eb"]);
    
    // Create the matrix cells
    svg.selectAll("rect")
      .data(matrixData)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.type))
      .attr("y", d => yScale(d.ip))
      .attr("width", cellSize - 1)
      .attr("height", cellSize - 1)
      .attr("fill", d => colorScale(d.value))
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
        
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="font-medium">${d.ip}</div>
            <div class="text-xs">${d.type}</div>
            <div class="mt-1 text-sm">${d.details}</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "none");
        
        tooltip
          .style("opacity", 0);
      });
    
    // Add the column labels (anomaly types)
    svg.selectAll(".column-label")
      .data(anomalyTypes)
      .enter()
      .append("text")
      .attr("class", "column-label")
      .attr("x", d => xScale(d) + cellSize / 2)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text(d => d);
    
    // Add the row labels (IPs)
    svg.selectAll(".row-label")
      .data(ips)
      .enter()
      .append("text")
      .attr("class", "row-label")
      .attr("x", margin.left - 10)
      .attr("y", d => yScale(d) + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12px")
      .text(d => d);
    
    // Add a title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Anomaly Correlation Matrix");
  };
  
  if (!anomalyData || 
      anomalyData.status !== 'success' || 
      (anomalyData.error_bursts.length === 0 && 
       anomalyData.high_traffic_ips.length === 0 && 
       anomalyData.unusual_patterns.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-medium text-gray-800">Anomaly Correlation</h2>
        </div>
        <div className="p-4 flex items-center justify-center h-40">
          <p className="text-gray-500">No anomaly data available for correlation analysis.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-medium text-gray-800">Anomaly Correlation</h2>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">
          This matrix shows correlations between different types of anomalies and IP addresses, 
          helping identify potential security issues or systematic problems.
        </p>
        <svg ref={svgRef} width="100%" height="300" />
        <div 
          ref={tooltipRef} 
          className="absolute bg-white p-2 rounded shadow-lg border border-gray-200 max-w-xs z-10 text-sm pointer-events-none" 
          style={{ opacity: 0 }}
        />
      </div>
    </div>
  );
};

export default AnomalyCorrelationMatrix; 