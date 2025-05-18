import React from 'react';

const AnomalySummary = ({ anomalyData }) => {
  if (!anomalyData || anomalyData.status !== 'success') {
    return null;
  }

  const { error_bursts, high_traffic_ips, unusual_patterns } = anomalyData;
  
  // Count total anomalies
  const totalAnomalies = error_bursts.length + high_traffic_ips.length + unusual_patterns.length;
  
  if (totalAnomalies === 0) {
    return null;
  }
  
  // Generate insights from the anomaly data
  const insights = generateInsights(anomalyData);
  
  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="border-b p-4">
        <h2 className="text-lg font-medium text-gray-800">Anomaly Insights & Recommendations</h2>
      </div>
      <div className="p-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-bold">Summary:</span> Detected {totalAnomalies} anomalies in the log data:
                {error_bursts.length > 0 && ` ${error_bursts.length} error bursts,`}
                {high_traffic_ips.length > 0 && ` ${high_traffic_ips.length} high traffic IPs,`}
                {unusual_patterns.length > 0 && ` ${unusual_patterns.length} unusual patterns.`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className={`border-l-4 ${insight.color} p-4`}>
              <h3 className="font-medium text-gray-800 mb-1">{insight.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
              
              {insight.recommendations.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700">Recommendations:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 ml-2 mt-1">
                    {insight.recommendations.map((rec, recIndex) => (
                      <li key={recIndex}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Function to generate insights and recommendations based on anomaly data
const generateInsights = (anomalyData) => {
  const { error_bursts, high_traffic_ips, unusual_patterns } = anomalyData;
  const insights = [];
  
  // Insight for error bursts
  if (error_bursts.length > 0) {
    // Get top error burst by count
    const topErrorBurst = [...error_bursts].sort((a, b) => b.error_count - a.error_count)[0];
    const primaryStatusCodes = Object.entries(topErrorBurst.status_codes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([code]) => code)
      .join(', ');
    
    insights.push({
      title: 'Error Burst Analysis',
      description: `Detected a significant spike of ${topErrorBurst.error_count} errors around ${topErrorBurst.time_period}, primarily status codes ${primaryStatusCodes}.`,
      color: 'border-red-500',
      recommendations: [
        `Check application logs around ${topErrorBurst.time_period} for related errors.`,
        `Review server status and resources during the spike period.`,
        topErrorBurst.status_codes['404'] ? 'Check for broken links or resources being referenced.' : '',
        topErrorBurst.status_codes['500'] ? 'Investigate server-side errors in your application logs.' : '',
        topErrorBurst.status_codes['403'] ? 'Review authentication mechanisms for potential issues.' : '',
      ].filter(Boolean),
    });
  }
  
  // Insight for high traffic IPs
  if (high_traffic_ips.length > 0) {
    // Analyze if multiple high traffic IPs exist
    const suspiciousIPs = high_traffic_ips.filter(ip => ip.traffic_percentage > 15);
    
    if (suspiciousIPs.length > 0) {
      const topIP = suspiciousIPs[0];
      const pathList = Object.keys(topIP.path_distribution).slice(0, 2).join(', ');
      
      insights.push({
        title: 'Suspicious Traffic Patterns',
        description: `IP ${topIP.ip_address} accounts for ${topIP.traffic_percentage.toFixed(1)}% of all traffic, with ${topIP.request_count} requests primarily to ${pathList}.`,
        color: 'border-amber-500',
        recommendations: [
          `Consider implementing rate limiting for this IP.`,
          `Verify if this IP belongs to a legitimate service or crawler.`,
          `Check request patterns for signs of scraping or automated scanning.`,
          `Monitor this IP for continued unusual activity.`,
        ],
      });
    }
  }
  
  // Insight for unusual patterns
  if (unusual_patterns.length > 0) {
    // Group by pattern types
    const patternsByType = unusual_patterns.reduce((acc, pattern) => {
      const type = pattern.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(pattern);
      return acc;
    }, {});
    
    // Check for unusual hour access
    if (patternsByType.unusual_hour_access && patternsByType.unusual_hour_access.length > 0) {
      const topPattern = patternsByType.unusual_hour_access[0];
      
      insights.push({
        title: 'Unusual Access Hours',
        description: `Detected access during unusual hours from IP ${topPattern.ip_address}, which could indicate scheduled tasks, international users, or potentially malicious activity.`,
        color: 'border-purple-500',
        recommendations: [
          `Verify expected access patterns for your application.`,
          `Consider implementing geolocation-based access rules if needed.`,
          `Check for legitimate scheduled jobs or automation coming from this IP.`,
        ],
      });
    }
    
    // Check for unusual error rates
    if (patternsByType.unusual_error_rate && patternsByType.unusual_error_rate.length > 0) {
      const topPattern = patternsByType.unusual_error_rate[0];
      
      insights.push({
        title: 'Abnormal Error Rates',
        description: `IP ${topPattern.ip_address} shows an unusual error rate pattern across ${topPattern.affected_paths.length} paths, with ${(topPattern.max_deviation * 100).toFixed(1)}% deviation from normal behavior.`,
        color: 'border-red-400',
        recommendations: [
          `Investigate if this is a bot or crawler experiencing high error rates.`,
          `Check if specific paths are returning errors for certain user agents.`,
          `Consider analyzing user journey for this IP to identify potential usability issues.`,
        ],
      });
    }
  }
  
  // General security recommendations if multiple anomalies are found
  if (error_bursts.length + high_traffic_ips.length + unusual_patterns.length > 3) {
    insights.push({
      title: 'Security Recommendation',
      description: 'Multiple anomalies detected may indicate attempted exploitation or security testing. Consider reviewing your security measures.',
      color: 'border-gray-500',
      recommendations: [
        'Review your Web Application Firewall (WAF) rules.',
        'Consider implementing CAPTCHA for suspicious traffic patterns.',
        'Ensure all software dependencies are up-to-date.',
        'Review access logs more frequently to identify ongoing patterns.',
      ],
    });
  }
  
  return insights;
};

export default AnomalySummary; 