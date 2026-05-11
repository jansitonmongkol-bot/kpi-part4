# =================================================================
# File: database.py (No changes)
# =================================================================
import mysql.connector
from mysql.connector import Error

DB_CONFIG = { 
    'host': 'localhost', 
    'user': 'root', 
    'password': 'Raptor@1234', 
    'database': 'kpi_database' }

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            return conn
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return None
