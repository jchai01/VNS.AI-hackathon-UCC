from flask import Flask, request, jsonify, send_file
from flask_cors import CORS, cross_origin
from flask import Response
import re
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import pandas as pd
import base64
from collections import Counter
import logging 
from user_agents import parse
from anomaly_detection import analyze_anomalies
import psycopg2
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Configure CORS to allow all origins in development
#CORS(app, resources={
#    r"/*": {
#        "origins": "*",
#        "methods": ["GET", "POST", "OPTIONS"],
#        "allow_headers": ["Content-Type", "Authorization", "Accept"],
#        "supports_credentials": False,
#        "expose_headers": ["Content-Range", "X-Content-Range"]
#    }
#})

# Connect to the database
conn = psycopg2.connect(database="mydb", user="postgres",
                        password="password", host="localhost", port="5432")

@app.route('/api/getIp', methods=['GET', 'OPTIONS'])
def getIp():
    app.logger.debug(f"Received request: Method={request.method}, Headers={dict(request.headers)}")
    
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response
    
    try:
        
        # create a cursor
        cur = conn.cursor()
        cur.execute('''SELECT * FROM geo_cache;''')
        
        # commit the changes
        conn.commit()
        
        # close the cursor and connection
        cur.close()
        conn.close()
        
        app.logger.info("Success")
        # return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

#@app.route('/api/parse-log', methods=['POST', 'OPTIONS'])
#CORS(app)  # Enable CORS for all routes

#app.wsgi_app = ProxyFix(
#    app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
#)

#CORS(app, resources={
#        r"/*": {
#            #"origins": ["*"],  # Allow all origins (replace with your frontend URL in production)
#            "origins": ["https://landfutures-oidc.insight-centre.org/"],  # Allow all origins (replace with your frontend URL in production)
#            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#            "allow_headers": ["Content-Type", "Authorization"]
#        }
#     },
#     supports_credentials=True)  # If using cookies/auth


white = ['http://localhost:8080','http://localhost:9000', 'https://landfutures-oidc.insight-centre.org']

@app.before_request
def basic_authentication():
    if request.method.lower() == 'options':
        return Response()

@app.after_request
def add_cors_headers(response):
    r = request.referrer[:-1]
    if r in white:
        response.headers.add('Access-Control-Allow-Origin', r)
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Headers', 'Cache-Control')
        response.headers.add('Access-Control-Allow-Headers', 'X-Requested-With')
        response.headers.add('Access-Control-Allow-Headers', 'Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
    return response

@app.route('/api/parse-log', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin(origin='*')
def parse_log():
    app.logger.debug(f"Received request: Method={request.method}, Headers={dict(request.headers)}")
    
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        #response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response
    
    try:
        app.logger.debug(f"Files in request: {request.files}")
        if 'file' not in request.files:
            app.logger.error("No file part in the request")
            return jsonify({"error": "No file part"}), 400
            
        file = request.files['file']
        
        if file.filename == '':
            app.logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400
            
        app.logger.info(f"Processing file: {file.filename}")
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
        
        app.logger.info("Successfully processed file")
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/export-summary', methods=['POST'])
def export_summary():
    data = request.json
    if not data or 'entries' not in data:
        return jsonify({"error": "No data provided"}), 400
    
    entries = data.get('entries', [])
    stats = data.get('stats', {})
    filters = data.get('filters', {})
    
    # Convert entries to DataFrame for easier chart generation
    df = pd.DataFrame(entries)
    if not df.empty and 'dateTime' in df.columns:
        df['dateTime'] = pd.to_datetime(df['dateTime'])
    
    # Generate HTML content for the summary report
    html_content = generate_html_summary(df, stats, filters)
    
    # Return HTML content
    response = jsonify({
        "content": html_content,
        "filename": f"nginx_summary_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    })
    
    return response

@app.route('/api/analyze-anomalies', methods=['POST'])
def analyze_log_anomalies():
    try:
        data = request.json
        if not data or 'entries' not in data:
            return jsonify({"error": "No data provided"}), 400
        
        entries = data.get('entries', [])
        
        # Convert entries to DataFrame for anomaly detection
        df = pd.DataFrame(entries)
        if not df.empty and 'dateTime' in df.columns:
            df['dateTime'] = pd.to_datetime(df['dateTime'])
        
        # Run anomaly detection
        result = analyze_anomalies(df)
        
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error detecting anomalies: {str(e)}", exc_info=True)
        return jsonify({"error": str(e), "status": "error"}), 500

# Chart generation functions
def create_empty_figure(message="No data"):
    fig = go.Figure()
    fig.add_annotation(
        text=message,
        xref="paper", yref="paper",
        x=0.5, y=0.5, showarrow=False,
        font=dict(size=20)
    )
    fig.update_layout(height=300)
    return fig

def generate_requests_over_time_chart(df):
    if df.empty or 'dateTime' not in df.columns:
        return create_empty_figure()
    
    # Group by hour
    df['hour'] = df['dateTime'].dt.floor('H')
    hourly_counts = df.groupby('hour').size().reset_index(name='count')
    
    fig = px.line(hourly_counts, x='hour', y='count', 
                  title='Requests Over Time',
                  labels={'hour': 'Time', 'count': 'Requests'})
    fig.update_layout(height=400)
    return fig

def generate_status_code_dist_chart(df):
    if df.empty or 'statusCode' not in df.columns:
        return create_empty_figure()
    
    status_counts = df['statusCode'].value_counts().reset_index()
    status_counts.columns = ['statusCode', 'count']
    
    fig = px.bar(status_counts, x='statusCode', y='count',
                 title='Status Code Distribution',
                 labels={'statusCode': 'HTTP Status Code', 'count': 'Count'})
    fig.update_layout(height=400)
    return fig

def generate_top_ips_chart(df, top_n=10):
    if df.empty or 'ipAddress' not in df.columns:
        return create_empty_figure()
    
    ip_counts = df['ipAddress'].value_counts().nlargest(top_n).reset_index()
    ip_counts.columns = ['ipAddress', 'count']
    
    fig = px.bar(ip_counts, x='count', y='ipAddress', orientation='h',
                 title=f'Top {top_n} IP Addresses',
                 labels={'ipAddress': 'IP Address', 'count': 'Requests'})
    fig.update_layout(height=400)
    return fig

def generate_top_paths_chart(df, top_n=10):
    if df.empty or 'path' not in df.columns:
        return create_empty_figure()
    
    path_counts = df['path'].value_counts().nlargest(top_n).reset_index()
    path_counts.columns = ['path', 'count']
    
    fig = px.bar(path_counts, x='count', y='path', orientation='h',
                 title=f'Top {top_n} Requested Paths',
                 labels={'path': 'Path', 'count': 'Requests'})
    fig.update_layout(height=400)
    return fig

def generate_http_methods_chart(df):
    if df.empty or 'method' not in df.columns:
        return create_empty_figure()
    
    method_counts = df['method'].value_counts().reset_index()
    method_counts.columns = ['method', 'count']
    
    fig = px.pie(method_counts, values='count', names='method',
                 title='HTTP Methods Distribution')
    fig.update_layout(height=400)
    return fig

def generate_browser_dist_chart(df, top_n=10):
    if df.empty or 'userAgent' not in df.columns:
        return create_empty_figure()
    
    # Parse user agents to get browser info
    browsers = {}
    for ua_string in df['userAgent']:
        try:
            user_agent = parse(ua_string)
            browser = user_agent.browser.family
            browsers[browser] = browsers.get(browser, 0) + 1
        except:
            browsers['Unknown'] = browsers.get('Unknown', 0) + 1
    
    browser_counts = pd.DataFrame(list(browsers.items()), columns=['browser', 'count'])
    browser_counts = browser_counts.nlargest(top_n, 'count')
    
    fig = px.pie(browser_counts, values='count', names='browser',
                 title=f'Top {top_n} Browsers')
    fig.update_layout(height=400)
    return fig

def generate_os_dist_chart(df, top_n=10):
    if df.empty or 'userAgent' not in df.columns:
        return create_empty_figure()
    
    # Parse user agents to get OS info
    os_dict = {}
    for ua_string in df['userAgent']:
        try:
            user_agent = parse(ua_string)
            os_family = user_agent.os.family
            os_dict[os_family] = os_dict.get(os_family, 0) + 1
        except:
            os_dict['Unknown'] = os_dict.get('Unknown', 0) + 1
    
    os_counts = pd.DataFrame(list(os_dict.items()), columns=['os', 'count'])
    os_counts = os_counts.nlargest(top_n, 'count')
    
    fig = px.pie(os_counts, values='count', names='os',
                 title=f'Top {top_n} Operating Systems')
    fig.update_layout(height=400)
    return fig

def generate_human_vs_bot_chart(df):
    if df.empty or 'userAgent' not in df.columns:
        return create_empty_figure()
    
    # Parse user agents to detect bots
    bot_counts = {'Human': 0, 'Bot': 0}
    for ua_string in df['userAgent']:
        try:
            user_agent = parse(ua_string)
            if user_agent.is_bot:
                bot_counts['Bot'] += 1
            else:
                bot_counts['Human'] += 1
        except:
            bot_counts['Human'] += 1  # Default to human if parsing fails
    
    bot_df = pd.DataFrame(list(bot_counts.items()), columns=['type', 'count'])
    
    fig = px.pie(bot_df, values='count', names='type',
                 title='Human vs Bot Traffic')
    fig.update_layout(height=400)
    return fig

def generate_top_referrers_chart(df, top_n=10):
    if df.empty or 'referer' not in df.columns:
        return create_empty_figure()
    
    # Filter out None/null values
    df_filtered = df[df['referer'].notna()]
    if df_filtered.empty:
        return create_empty_figure("No referrer data")
    
    # Extract domain from referrer
    def extract_domain(referer):
        try:
            # Simple domain extraction - could be improved
            domain = referer.split('//')[1].split('/')[0] if '//' in referer else referer
            return domain
        except:
            return "Unknown"
    
    df_filtered['domain'] = df_filtered['referer'].apply(extract_domain)
    referrer_counts = df_filtered['domain'].value_counts().nlargest(top_n).reset_index()
    referrer_counts.columns = ['domain', 'count']
    
    fig = px.bar(referrer_counts, x='count', y='domain', orientation='h',
                 title=f'Top {top_n} Referrers',
                 labels={'domain': 'Domain', 'count': 'Requests'})
    fig.update_layout(height=400)
    return fig

def generate_response_size_dist_chart(df):
    if df.empty or 'bytes' not in df.columns:
        return create_empty_figure()
    
    # Create size categories
    def categorize_size(size):
        if size == 0:
            return '0 B'
        elif size < 1024:
            return '<1 KB'
        elif size < 10 * 1024:
            return '1-10 KB'
        elif size < 100 * 1024:
            return '10-100 KB'
        elif size < 1024 * 1024:
            return '100 KB-1 MB'
        else:
            return '>1 MB'
    
    df['size_category'] = df['bytes'].apply(categorize_size)
    size_counts = df['size_category'].value_counts().reset_index()
    size_counts.columns = ['category', 'count']
    
    # Define order for categories
    size_order = ['0 B', '<1 KB', '1-10 KB', '10-100 KB', '100 KB-1 MB', '>1 MB']
    size_counts['order'] = size_counts['category'].apply(lambda x: size_order.index(x) if x in size_order else 999)
    size_counts = size_counts.sort_values('order')
    
    fig = px.bar(size_counts, x='category', y='count',
                 title='Response Size Distribution',
                 labels={'category': 'Size Category', 'count': 'Count'})
    fig.update_layout(height=400)
    return fig

def generate_html_summary(df, stats, filters):
    """Generate HTML summary report similar to the one in report.py"""
    html_content = "<html><head><title>NGINX Log Summary Report</title>"
    html_content += "<style>body{font-family: sans-serif; margin: 20px;} table{border-collapse: collapse; width: 80%; margin-bottom:20px; margin-left:auto; margin-right:auto;} th,td{border:1px solid #ddd; padding:8px; text-align:left;} th{background-color:#f2f2f2;} .chart-container{text-align:center; margin-bottom:30px;}</style>"
    html_content += "</head><body>"
    html_content += f"<h1 style='text-align:center;'>NGINX Log Summary Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</h1>"
    
    # Add filter information
    html_content += "<h2>Current Filter Settings:</h2><ul>"
    html_content += f"<li>Date Range: {filters.get('startDate', 'N/A')} to {filters.get('endDate', 'N/A')}</li>"
    html_content += f"<li>Method: {filters.get('methodFilter', 'All')}</li>"
    html_content += f"<li>IP Address Filter: {filters.get('ipAddressFilter', 'None')}</li>"
    html_content += f"<li>Status Code: {filters.get('statusCodeFilter', 'All')}</li>"
    html_content += f"<li>Country: {filters.get('countryFilter', 'All')}</li></ul>"

    # Add summary statistics
    html_content += "<h2>Summary Statistics:</h2><ul>"
    html_content += f"<li>Total Requests: {stats.get('requests', 0)}</li>"
    html_content += f"<li>Unique Visitors: {stats.get('sessions', 0)}</li>"
    html_content += f"<li>Total Bandwidth: {stats.get('bandwidth', 0)} bytes</li></ul>"

    # Add charts to the report
    html_content += "<h2>Traffic Analysis Charts:</h2>"
    
    chart_functions = {
        "Requests Over Time": generate_requests_over_time_chart,
        "Status Code Distribution": generate_status_code_dist_chart,
        "Top IP Addresses": generate_top_ips_chart,
        "Top Requested Paths": generate_top_paths_chart,
        "HTTP Methods": generate_http_methods_chart,
        "Browser Distribution": generate_browser_dist_chart,
        "OS Distribution": generate_os_dist_chart,
        "Human vs. Bot": generate_human_vs_bot_chart,
        "Top Referrers": generate_top_referrers_chart,
        "Response Size Distribution": generate_response_size_dist_chart
    }
    
    for chart_name, chart_func in chart_functions.items():
        html_content += f"<div class='chart-container'><h3>{chart_name}</h3>"
        
        try:
            fig = chart_func(df)
            img_bytes = fig.to_image(format="png", engine="kaleido", width=800, height=400)
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            html_content += f"<img src='data:image/png;base64,{img_base64}' alt='{chart_name}' style='max-width:100%;'>"
        except Exception as e:
            html_content += f"<p>Error generating chart: {str(e)}</p>"
            
        html_content += "</div>"
    
    # Top IPs
    html_content += "<h2>Top IP Addresses:</h2>"
    ip_counts = Counter(df['ipAddress'].tolist())
    top_ips = ip_counts.most_common(10)
    
    html_content += "<table><tr><th>IP Address</th><th>Requests</th></tr>"
    for ip, count in top_ips:
        html_content += f"<tr><td>{ip}</td><td>{count}</td></tr>"
    html_content += "</table>"

    # Status Code Distribution
    html_content += "<h2>Status Code Distribution:</h2>"
    status_counts = Counter(df['statusCode'].tolist())
    
    html_content += "<table><tr><th>Status Code</th><th>Count</th></tr>"
    for status, count in status_counts.most_common():
        html_content += f"<tr><td>{status}</td><td>{count}</td></tr>"
    html_content += "</table>"
    
    html_content += "</body></html>"
    
    return html_content

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
    app.run(host='0.0.0.0', port=5002) 
