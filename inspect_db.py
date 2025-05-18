import sqlite3

def inspect_database():
    # Connect to the SQLite database
    conn = sqlite3.connect('geolocation_cache.db')
    cursor = conn.cursor()
    
    # Get all tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    if not tables:
        print("No tables found in the database.")
        return
    
    print(f"Found {len(tables)} tables in the database:")
    
    # For each table, show structure and sample data
    for table in tables:
        table_name = table[0]
        print(f"\nTable: {table_name}")
        
        # Get column information
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        print("Columns:")
        for col in columns:
            col_id, name, type_, notnull, default_val, pk = col
            print(f"  {name} ({type_}){' PRIMARY KEY' if pk else ''}{' NOT NULL' if notnull else ''}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        print(f"Row count: {row_count}")
        
        # Get sample data (first 5 rows)
        if row_count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
            sample_data = cursor.fetchall()
            
            print("Sample data (up to 5 rows):")
            for row in sample_data:
                print(f"  {row}")
    
    conn.close()

if __name__ == "__main__":
    inspect_database() 