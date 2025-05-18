import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def detect_error_bursts(df, time_window_minutes=5, threshold_factor=2.0, min_errors=3):
    """
    Detect sudden bursts of error responses (4xx, 5xx) in time windows.
    
    This uses a statistical approach based on the z-score method and control charts,
    which are well-established in statistical process control (SPC).
    
    Args:
        df: DataFrame containing log entries with 'statusCode' and 'dateTime' columns
        time_window_minutes: Size of the time window to analyze (minutes)
        threshold_factor: How many standard deviations above the mean to consider anomalous
        min_errors: Minimum number of errors required to consider a burst
    
    Returns:
        List of detected error bursts with details
    """
    if df.empty or 'statusCode' not in df.columns or 'dateTime' not in df.columns:
        return []
    
    # Ensure datetime format
    if not pd.api.types.is_datetime64_any_dtype(df['dateTime']):
        df['dateTime'] = pd.to_datetime(df['dateTime'])
    
    # Filter error responses (4xx and 5xx)
    errors_df = df[df['statusCode'] >= 400].copy()
    if errors_df.empty:
        return []
    
    # Group errors by time windows
    errors_df['time_window'] = errors_df['dateTime'].dt.floor(f'{time_window_minutes}min')
    error_counts = errors_df.groupby('time_window').size().reset_index(name='error_count')
    
    if len(error_counts) <= 1:
        return []
    
    # Calculate mean and standard deviation
    mean_errors = error_counts['error_count'].mean()
    std_errors = error_counts['error_count'].std()
    
    # Set the anomaly threshold (z-score based)
    if pd.isna(std_errors) or std_errors == 0:
        # If std is 0, use a simple multiple of the mean
        threshold = max(min_errors, mean_errors * threshold_factor)
    else:
        # Z-score based threshold (mean + factor * std)
        threshold = max(min_errors, mean_errors + threshold_factor * std_errors)
    
    # Detect anomalies
    anomalies = error_counts[error_counts['error_count'] >= threshold]
    
    bursts = []
    for _, row in anomalies.iterrows():
        window_start = row['time_window']
        window_end = window_start + timedelta(minutes=time_window_minutes)
        
        # Get details about errors in this window
        window_errors = errors_df[
            (errors_df['dateTime'] >= window_start) & 
            (errors_df['dateTime'] < window_end)
        ]
        
        status_counts = Counter(window_errors['statusCode'].astype(str))
        ips_involved = window_errors['ipAddress'].nunique()
        
        bursts.append({
            "time_period": f"{window_start.strftime('%Y-%m-%d %H:%M')} - {window_end.strftime('%H:%M')}",
            "error_count": int(row['error_count']), 
            "ips_involved_count": ips_involved,
            "status_codes": dict(status_counts),
            "threshold": float(threshold),
            "mean_errors": float(mean_errors),
            "z_score": float((row['error_count'] - mean_errors) / std_errors) if std_errors > 0 else float('inf'),
            "explanation": f"Found {row['error_count']} errors in a {time_window_minutes}-minute window, which exceeds the threshold of {threshold:.2f} (baseline: {mean_errors:.2f} errors)"
        })
    
    return sorted(bursts, key=lambda x: x['error_count'], reverse=True)

def detect_high_traffic_ips(df, threshold_factor=2.5, min_requests=20, time_window_minutes=60):
    """
    Detect IPs with abnormally high request rates using IQR (Interquartile Range) method.
    
    The IQR method is resistant to outliers and is widely used in statistical analysis
    for anomaly detection. It's recommended by John Tukey's exploratory data analysis approach.
    
    Args:
        df: DataFrame containing log entries with 'ipAddress' and 'dateTime' columns
        threshold_factor: Multiplier for IQR to determine outliers (typically 1.5-3.0)
        min_requests: Minimum request count to consider an IP anomalous
        time_window_minutes: Window size for rate calculation
    
    Returns:
        List of detected high-traffic IPs with details
    """
    if df.empty or 'ipAddress' not in df.columns:
        return []
    
    # Ensure datetime format
    if 'dateTime' in df.columns and not pd.api.types.is_datetime64_any_dtype(df['dateTime']):
        df['dateTime'] = pd.to_datetime(df['dateTime'])
    
    # Get overall request counts per IP
    ip_counts = df['ipAddress'].value_counts().reset_index()
    ip_counts.columns = ['ipAddress', 'request_count']
    
    if len(ip_counts) <= 1:
        return []
    
    # Calculate request rates if dateTime is available
    if 'dateTime' in df.columns:
        # Group by IP and time window to get rates
        df['time_window'] = df['dateTime'].dt.floor(f'{time_window_minutes}min')
        ip_window_counts = df.groupby(['ipAddress', 'time_window']).size().reset_index(name='window_count')
        
        # Get maximum request rate for each IP
        ip_rates = ip_window_counts.groupby('ipAddress')['window_count'].max().reset_index()
        ip_rates.columns = ['ipAddress', 'max_rate']
        
        # Merge with overall counts
        ip_counts = pd.merge(ip_counts, ip_rates, on='ipAddress', how='left')
    else:
        # If no time data, use total counts as the rate
        ip_counts['max_rate'] = ip_counts['request_count']
    
    # Calculate IQR for the rates
    q1 = ip_counts['max_rate'].quantile(0.25)
    q3 = ip_counts['max_rate'].quantile(0.75)
    iqr = q3 - q1
    
    # Set the anomaly threshold using IQR method
    if iqr > 0:
        rate_threshold = q3 + threshold_factor * iqr
    else:
        # Fallback if IQR is 0
        rate_threshold = ip_counts['max_rate'].mean() * threshold_factor
    
    # Ensure minimum threshold
    rate_threshold = max(min_requests, rate_threshold)
    
    # Detect anomalies
    anomalies = ip_counts[ip_counts['max_rate'] >= rate_threshold]
    
    high_traffic_ips = []
    for _, row in anomalies.iterrows():
        ip = row['ipAddress']
        total_requests = row['request_count']
        max_rate = row['max_rate']
        
        # Get additional details about this IP's activity
        ip_activity = df[df['ipAddress'] == ip]
        
        # Calculate the percentage of total traffic
        traffic_percentage = (total_requests / len(df)) * 100
        
        # Get status code distribution
        status_counts = ip_activity['statusCode'].value_counts().to_dict() if 'statusCode' in df.columns else {}
        
        # Get path distribution (top 5 most accessed paths)
        path_distribution = {}
        if 'path' in df.columns:
            path_counts = ip_activity['path'].value_counts().head(5).to_dict()
            path_distribution = {str(k): int(v) for k, v in path_counts.items()}
        
        high_traffic_ips.append({
            "ip_address": ip,
            "request_count": int(total_requests),
            "max_rate_per_window": int(max_rate),
            "traffic_percentage": float(traffic_percentage),
            "threshold": float(rate_threshold),
            "q3": float(q3),
            "iqr": float(iqr),
            "status_code_distribution": status_counts,
            "path_distribution": path_distribution,
            "explanation": f"IP {ip} made {total_requests} requests with a maximum rate of {max_rate} requests per {time_window_minutes}-minute window, which exceeds the threshold of {rate_threshold:.2f} (Q3: {q3:.2f}, IQR: {iqr:.2f})"
        })
    
    return sorted(high_traffic_ips, key=lambda x: x['max_rate_per_window'], reverse=True)

def detect_unusual_patterns(df, min_confidence=0.8):
    """
    Detect unusual patterns in the log data based on multiple factors,
    using a deviation-based ensemble approach.
    
    This implements an interpretable multi-dimensional anomaly detection approach
    that considers multiple behavioral factors and their correlations.
    
    Args:
        df: DataFrame containing log entries
        min_confidence: Minimum confidence threshold (0.0-1.0) to report an anomaly
    
    Returns:
        List of detected unusual patterns with explanations
    """
    if df.empty or len(df) < 10:  # Need minimum data for meaningful patterns
        return []
    
    # Ensure datetime
    if 'dateTime' in df.columns and not pd.api.types.is_datetime64_any_dtype(df['dateTime']):
        df['dateTime'] = pd.to_datetime(df['dateTime'])
    
    unusual_patterns = []
    
    # 1. Unusual hour of access pattern
    if 'dateTime' in df.columns:
        # Get typical hour of day distribution
        hour_counts = df['dateTime'].dt.hour.value_counts().sort_index()
        total_requests = len(df)
        typical_hours = hour_counts[hour_counts > (total_requests * 0.03)].index.tolist()
        
        # Group by IP
        ip_hour_patterns = defaultdict(list)
        for ip, group in df.groupby('ipAddress'):
            if len(group) < 5:  # Skip IPs with few requests
                continue
                
            ip_hours = group['dateTime'].dt.hour.value_counts().sort_index()
            ip_unusual_hours = [h for h in ip_hours.index if h not in typical_hours and ip_hours[h] > 2]
            
            if ip_unusual_hours:
                unusual_count = sum(ip_hours[h] for h in ip_unusual_hours)
                confidence = min(1.0, unusual_count / (len(group) + 1) * 2)
                
                if confidence >= min_confidence:
                    ip_hour_patterns[ip] = {
                        "type": "unusual_hour_access",
                        "ip_address": ip,
                        "unusual_hours": ip_unusual_hours,
                        "request_count": int(len(group)),
                        "unusual_count": int(unusual_count),
                        "confidence": float(confidence),
                        "explanation": f"IP {ip} made {unusual_count} requests during unusual hours {ip_unusual_hours}, when most traffic occurs during {typical_hours}"
                    }
        
        # Add detected patterns
        for pattern in ip_hour_patterns.values():
            unusual_patterns.append(pattern)
    
    # 2. Unusual path to status code ratio pattern
    if 'path' in df.columns and 'statusCode' in df.columns:
        # Calculate baseline success/error rates for each path
        path_status = df.groupby('path')['statusCode'].agg(['count', lambda x: (x < 400).mean()])
        path_status.columns = ['count', 'success_rate']
        
        # Only consider paths with enough samples
        path_baselines = path_status[path_status['count'] >= 5].to_dict('index')
        
        # Analyze per IP
        unusual_status_patterns = []
        for ip, group in df.groupby('ipAddress'):
            if len(group) < 5:  # Skip IPs with few requests
                continue
                
            # Check each path this IP has accessed
            ip_path_stats = defaultdict(dict)
            for path, path_group in group.groupby('path'):
                if path not in path_baselines or len(path_group) < 3:
                    continue
                    
                baseline = path_baselines[path]['success_rate']
                ip_success_rate = (path_group['statusCode'] < 400).mean()
                
                # Calculate deviation from baseline
                deviation = abs(baseline - ip_success_rate)
                
                if deviation > 0.3:  # 30% deviation threshold
                    ip_path_stats[path] = {
                        "baseline_success": baseline,
                        "ip_success_rate": ip_success_rate,
                        "deviation": deviation,
                        "request_count": len(path_group)
                    }
            
            if ip_path_stats:
                # Calculate overall confidence across paths
                total_unusual = sum(stats["request_count"] for stats in ip_path_stats.values())
                max_deviation = max(stats["deviation"] for stats in ip_path_stats.values())
                confidence = min(1.0, (total_unusual / len(group)) * max_deviation * 2)
                
                if confidence >= min_confidence:
                    unusual_status_patterns.append({
                        "type": "unusual_error_rate",
                        "ip_address": ip,
                        "affected_paths": list(ip_path_stats.keys()),
                        "max_deviation": float(max_deviation),
                        "confidence": float(confidence),
                        "path_details": {k: {
                            "baseline_success": float(v["baseline_success"]), 
                            "ip_success_rate": float(v["ip_success_rate"]),
                            "requests": int(v["request_count"])
                        } for k, v in ip_path_stats.items()},
                        "explanation": f"IP {ip} has unusual success/error rates on {len(ip_path_stats)} paths, with up to {max_deviation:.2f} deviation from normal baseline"
                    })
        
        # Add detected patterns
        unusual_patterns.extend(unusual_status_patterns)
    
    # 3. Unusual request rate pattern (rapid changes)
    if 'dateTime' in df.columns:
        # Group by time windows (e.g., 5-minute windows)
        window_size = '5min'
        df['time_window'] = df['dateTime'].dt.floor(window_size)
        
        # Get baseline request rate pattern
        window_counts = df.groupby('time_window').size()
        
        # Skip if too few windows
        if len(window_counts) >= 3:
            # Detect windows with unusual rates (using z-score)
            window_mean = window_counts.mean()
            window_std = window_counts.std()
            
            if window_std > 0:
                window_zscores = (window_counts - window_mean) / window_std
                unusual_windows = window_zscores[abs(window_zscores) > 2.5].index.tolist()
                
                # Group by IP to find which ones contributed to unusual windows
                ip_window_counts = df.groupby(['ipAddress', 'time_window']).size().reset_index(name='count')
                
                # Find IPs with significant contribution to unusual windows
                unusual_rate_ips = []
                
                for ip, group in ip_window_counts.groupby('ipAddress'):
                    if len(group) < 2:  # Skip IPs with activity in only one window
                        continue
                        
                    # Check if this IP was active during unusual windows
                    ip_unusual_windows = group[group['time_window'].isin(unusual_windows)]
                    
                    if len(ip_unusual_windows) > 0:
                        # Calculate what percentage of the unusual traffic this IP accounts for
                        total_unusual_requests = df[df['time_window'].isin(unusual_windows)].shape[0]
                        ip_unusual_requests = ip_unusual_windows['count'].sum()
                        
                        contribution = ip_unusual_requests / total_unusual_requests
                        
                        if contribution > 0.2:  # IP responsible for at least 20% of unusual traffic
                            confidence = min(1.0, contribution * 1.5)
                            
                            if confidence >= min_confidence:
                                # Get the actual request counts in each unusual window
                                window_details = {}
                                for _, row in ip_unusual_windows.iterrows():
                                    window_time = row['time_window']
                                    window_details[str(window_time)] = {
                                        "ip_requests": int(row['count']),
                                        "total_requests": int(df[df['time_window'] == window_time].shape[0]),
                                        "z_score": float(window_zscores.get(window_time, 0))
                                    }
                                
                                unusual_rate_ips.append({
                                    "type": "unusual_request_rate",
                                    "ip_address": ip,
                                    "contribution": float(contribution),
                                    "confidence": float(confidence),
                                    "window_details": window_details,
                                    "explanation": f"IP {ip} contributed to {ip_unusual_requests} requests during unusual traffic windows, accounting for {contribution:.1%} of the unusual traffic"
                                })
                
                # Add detected patterns
                unusual_patterns.extend(unusual_rate_ips)
    
    # Sort by confidence level and return
    return sorted(unusual_patterns, key=lambda x: x['confidence'], reverse=True)

def analyze_anomalies(df):
    """
    Main function to analyze a log dataframe for all types of anomalies
    
    Args:
        df: DataFrame containing log entries
        
    Returns:
        Dictionary containing all detected anomalies
    """
    logger.info("Starting anomaly detection analysis...")
    
    # Convert to pandas dataframe if necessary
    if not isinstance(df, pd.DataFrame):
        if isinstance(df, list) and len(df) > 0:
            df = pd.DataFrame(df)
        else:
            return {
                "error_bursts": [],
                "high_traffic_ips": [],
                "unusual_patterns": [],
                "status": "error",
                "message": "Invalid data format for anomaly detection"
            }
    
    # Ensure proper datetime format
    if 'dateTime' in df.columns and not pd.api.types.is_datetime64_any_dtype(df['dateTime']):
        df['dateTime'] = pd.to_datetime(df['dateTime'])
    
    # Run all detection algorithms
    logger.info("Detecting error bursts...")
    error_bursts = detect_error_bursts(df)
    
    logger.info("Detecting high traffic IPs...")
    high_traffic_ips = detect_high_traffic_ips(df)
    
    logger.info("Detecting unusual patterns...")
    unusual_patterns = detect_unusual_patterns(df)
    
    logger.info(f"Anomaly detection complete. Found {len(error_bursts)} error bursts, "
                f"{len(high_traffic_ips)} high traffic IPs, and {len(unusual_patterns)} unusual patterns.")
    
    return {
        "error_bursts": error_bursts,
        "high_traffic_ips": high_traffic_ips,
        "unusual_patterns": unusual_patterns,
        "status": "success",
        "message": f"Analysis complete: {len(error_bursts)} error bursts, {len(high_traffic_ips)} high traffic IPs, {len(unusual_patterns)} unusual patterns"
    } 