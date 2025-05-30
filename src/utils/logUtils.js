import { format } from 'date-fns';

// Get requests by hour of day or by day
export const getRequestsByHourOfDay = (entries, interval = 'hourly') => {
  if (interval === 'daily') {
    const dayCounts = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.dateTime);
      const key = format(date, 'yyyy-MM-dd');
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dayCounts).sort();
    
    return {
      labels: sortedDates.map(date => format(new Date(date), 'MMM dd')),
      data: sortedDates.map(key => dayCounts[key])
    };
  } else {
    // Hourly aggregation
    const hourCounts = Array(24).fill(0);
    
    entries.forEach(entry => {
      // Handle both string ISO dates and Date objects
      const date = typeof entry.dateTime === 'string' ? new Date(entry.dateTime) : entry.dateTime;
      const hour = date.getHours();
      hourCounts[hour]++;
    });
    
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      data: hourCounts
    };
  }
};

// Get requests by path (most requested files)
export const getMostRequestedFiles = (entries, limit = 10) => {
  const pathCounts = {};

  entries.forEach((entry) => {
    const path = entry.path;
    pathCounts[path] = (pathCounts[path] || 0) + 1;
  });

  return Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, hits]) => ({ path, hits }));
};

export const getTopIPAddress = (entries, limit = 10) => {
  const ipCount = {};

  entries.forEach((entry) => {
    const ip = entry.ipAddress;
    ipCount[ip] = (ipCount[ip] || 0) + 1;
  });

  return Object.entries(ipCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ip, hits]) => ({ ip, hits }));
};

// Get status code distribution
export const getStatusCodeDistribution = (entries) => {
  const statusCounts = {};

  entries.forEach((entry) => {
    const status = entry.statusCode;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, hits]) => ({ status: parseInt(status), hits }));
};

// Get top referrers
export const getTopReferrers = (entries, limit = 5) => {
  const referrerCounts = {};

  entries.forEach((entry) => {
    if (entry.referer) {
      try {
        const url = new URL(entry.referer);
        const domain = url.hostname;
        referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
      } catch (e) {
        // Invalid URL format, skip
      }
    }
  });

  return Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([referrer, hits]) => ({ referrer, hits }));
};

// Parse user agent to get browser and device information
export const parseUserAgents = (entries) => {
  const browsers = {};
  const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
  const operatingSystems = {};

  entries.forEach((entry) => {
    // This is a simplified version - in a real app, use ua-parser-js for accurate parsing
    const ua = entry.userAgent.toLowerCase();

    // Extract browser
    let browser;
    if (ua.includes("chrome") && !ua.includes("edge")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome"))
      browser = "Safari";
    else if (ua.includes("edge") || ua.includes("edg")) browser = "Edge";
    else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
    else if (ua.includes("msie") || ua.includes("trident"))
      browser = "Internet Explorer";
    else browser = "Other";

    browsers[browser] = (browsers[browser] || 0) + 1;

    // Extract device type
    let device;
    if (ua.includes("mobile")) device = "Mobile";
    else if (ua.includes("tablet") || ua.includes("ipad")) device = "Tablet";
    else device = "Desktop";

    devices[device]++;
    
    // Extract OS
    let os;
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac os") || ua.includes("macos")) os = "macOS";
    else if (ua.includes("ios")) os = "iOS";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("ubuntu")) os = "Ubuntu";
    else if (ua.includes("chrome os")) os = "ChromeOS";
    else os = "Other";
    
    operatingSystems[os] = (operatingSystems[os] || 0) + 1;
  });

  return {
    browsers: Object.entries(browsers)
      .sort((a, b) => b[1] - a[1])
      .map(([browser, hits]) => ({ browser, hits })),
    devices: Object.entries(devices)
      .sort((a, b) => b[1] - a[1])
      .map(([device, hits]) => ({ device, hits })),
    operatingSystems: Object.entries(operatingSystems)
      .sort((a, b) => b[1] - a[1])
      .map(([os, hits]) => ({ os, hits })),
  };
};

// Get HTTP methods distribution
export const getHttpMethodsDistribution = (entries) => {
  const methodCounts = {};

  entries.forEach((entry) => {
    const method = entry.method || 'Unknown';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  return Object.entries(methodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([method, hits]) => ({ method, hits }));
};

// Get human vs bot traffic
export const getHumanVsBotTraffic = (entries) => {
  let humans = 0;
  let bots = 0;

  entries.forEach((entry) => {
    const ua = entry.userAgent.toLowerCase();
    // Simple bot detection - could be improved with better detection
    if (
      ua.includes('bot') || 
      ua.includes('spider') || 
      ua.includes('crawl') ||
      ua.includes('scrape')
    ) {
      bots++;
    } else {
      humans++;
    }
  });

  return [
    { type: 'Human', hits: humans },
    { type: 'Bot', hits: bots }
  ];
};

// Get response size distribution
export const getResponseSizeDistribution = (entries) => {
  const sizeCategories = {
    '0 B': 0,
    '<1 KB': 0,
    '1-10 KB': 0,
    '10-100 KB': 0,
    '100 KB-1 MB': 0,
    '>1 MB': 0
  };

  entries.forEach((entry) => {
    const bytes = entry.bytes;
    if (bytes === 0) {
      sizeCategories['0 B']++;
    } else if (bytes < 1024) {
      sizeCategories['<1 KB']++;
    } else if (bytes < 10 * 1024) {
      sizeCategories['1-10 KB']++;
    } else if (bytes < 100 * 1024) {
      sizeCategories['10-100 KB']++;
    } else if (bytes < 1024 * 1024) {
      sizeCategories['100 KB-1 MB']++;
    } else {
      sizeCategories['>1 MB']++;
    }
  });

  // Define order for categories for consistent display
  const categoryOrder = ['0 B', '<1 KB', '1-10 KB', '10-100 KB', '100 KB-1 MB', '>1 MB'];
  
  return categoryOrder.map(category => ({
    category,
    count: sizeCategories[category]
  }));
};
