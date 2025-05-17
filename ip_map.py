import csv
import json
import ipaddress

# Paths to the extracted CSV files
blocks_file = 'GeoLite2-City-Blocks-IPv4.csv'
locations_file = 'GeoLite2-City-Locations-en.csv'

# Load location data into a dictionary
locations = {}
with open(locations_file, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        geoname_id = row['geoname_id']
        locations[geoname_id] = {
            'city': row['city_name'],
            'country': row['country_name'],
            'code': row['country_iso_code'],
            'lat': row['latitude'],
            'lng': row['longitude']
        }

# Process block data and map to locations
ip_mappings = []
with open(blocks_file, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        network = row['network']
        geoname_id = row['geoname_id']
        if geoname_id in locations:
            try:
                net = ipaddress.IPv4Network(network)
                ip_mappings.append({
                    'ipRange': [str(net.network_address), str(net.broadcast_address)],
                    **locations[geoname_id]
                })
            except ValueError:
                continue

# Save to JSON file
with open('ip_to_city.json', 'w', encoding='utf-8') as jsonfile:
    json.dump(ip_mappings, jsonfile, ensure_ascii=False, indent=2)
