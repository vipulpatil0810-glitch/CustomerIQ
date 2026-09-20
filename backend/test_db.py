from database import get_connection


connection = get_connection()

if connection.is_connected():
    print("MySQL connection successful!")
    print("Database:", connection.database)

connection.close()