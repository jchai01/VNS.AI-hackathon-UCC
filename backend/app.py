from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/parse-log', methods=['POST'])
def parse_log():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    content = file.read().decode('utf-8')
    lines = content.split('\n')
    lines = [line for line in lines if line.strip()]
    
    parsed_entries = parse_nginx_log(lines)
    
    # Calculate summary statistics
    result = {
        "fileName": file.filename,
        "entries": parsed_entries,
        "totalRequests": len(parsed_entries),
        "uniqueVisitors": len(set(entry["ipAddress"] for entry in parsed_entries)),
        "totalBandwidth": sum(entry["bytes"] for entry in parsed_entries),
    }
    
    return jsonify(result)

def parse_nginx_log(lines):
    # Standard log format regex
    standard_log_regex = r'^(\S+) - (\S+) \[(.*?)\] "(\S+) (.*?) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"'
    # Empty request format regex
    empty_request_log_regex = r'^(\S+) - (\S+) \[(.*?)\] "" (\d+) (\d+) "([^"]*)" "([^"]*)"'
    
    parsed_entries = []
    
    for line in lines:
        match = re.match(standard_log_regex, line)
        
        if not match:
            match = re.match(empty_request_log_regex, line)
            if match:
                # For empty request, restructure to match our expected format
                ip_address, user, date_time = match.groups()[:3]
                status_code, bytes_sent = match.groups()[3:5]
                referer, user_agent = match.groups()[5:7]
                
                # Empty method, path, http_version
                method, path, http_version = '', '', ''
            else:
                # If neither regex matches, skip this line
                continue
        else:
            # Extract values from standard log format
            ip_address, user, date_time, method, path, http_version = match.groups()[:6]
            status_code, bytes_sent = match.groups()[6:8]
            referer, user_agent = match.groups()[8:10]
        
        # Parse date
        try:
            # Format: 17/Apr/2025:05:10:56 +0100
            date_pattern = r'(\d+)/(\w+)/(\d+):(\d+):(\d+):(\d+)'
            date_match = re.search(date_pattern, date_time)
            
            if date_match:
                day, month, year, hour, minute, second = date_match.groups()
                month_map = {
                    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 
                    'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
                    'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
                }
                month_num = month_map.get(month, 1)
                parsed_date = datetime(int(year), month_num, int(day), 
                                      int(hour), int(minute), int(second))
                date_time_iso = parsed_date.isoformat()
            else:
                date_time_iso = None
        except Exception:
            date_time_iso = None
        
        parsed_entries.append({
            "ipAddress": ip_address,
            "dateTime": date_time_iso,
            "method": method,
            "path": path,
            "statusCode": int(status_code),
            "bytes": int(bytes_sent),
            "referer": referer if referer != '-' else None,
            "userAgent": user_agent
        })
    
    return parsed_entries

if __name__ == '__main__':
    app.run(debug=True, port=5000) 