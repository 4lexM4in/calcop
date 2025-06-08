import pyodbc

def get_connection():
    return pyodbc.connect(
        'DRIVER={ODBC Driver 17 for SQL Server};'
        'SERVER=127.0.0.1,1433;'
        'DATABASE=Деканат1;'
        'UID=sa;'
        'PWD=646758523604DVFU@;'
        'TrustServerCertificate=yes;'
        'Connection Timeout=30;'
    )

def check_db_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 10 * FROM rpDrafts")
        rows = cursor.fetchall()
        
        print("Успешное подключение к базе данных. Результаты запроса:")
        for row in rows:
            print(row)

        cursor.close()
        conn.close()
    except Exception as e:
        print("Ошибка при подключении к базе данных или выполнении запроса:", e)

if __name__ == "__main__":
    check_db_connection()
    
