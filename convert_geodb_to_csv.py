import sqlite3
import csv
import os

def convert_db_to_csv():
    # Connect to the SQLite database
    conn = sqlite3.connect('geolocation_cache.db')
    cursor = conn.cursor()
    
    # Get all tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    if not tables:
        print("No tables found in the database.")
        return
    
    print(f"Found {len(tables)} tables in the database.")
    
    # Create a directory for output CSV files if it doesn't exist
    if not os.path.exists('csv_output'):
        os.makedirs('csv_output')
    
    # For each table, export to CSV
    for table in tables:
        table_name = table[0]
        print(f"Exporting table: {table_name}")
        
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Get all data from the table
        cursor.execute(f"SELECT * FROM {table_name};")
        rows = cursor.fetchall()
        
        # Write to CSV
        output_file = os.path.join('csv_output', f"{table_name}.csv")
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            csvwriter = csv.writer(csvfile)
            csvwriter.writerow(columns)  # Write header
            csvwriter.writerows(rows)    # Write data
        
        print(f"Exported {len(rows)} rows to {output_file}")
    
    conn.close()
    print("Conversion completed successfully!")

if __name__ == "__main__":
    convert_db_to_csv() 