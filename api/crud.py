# =================================================================
# File: crud.py
# =================================================================
from database import get_db_connection
from auth import get_password_hash
import schemas
from datetime import date

def get_user_by_username(user_name: str):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT e.id as employees_id, e.*, l.user_name, l.password FROM login l JOIN employees e ON l.employees_id = e.id WHERE l.user_name = %s"
        cursor.execute(query, (user_name,))
        return cursor.fetchone()
    finally:
        if conn.is_connected():
            conn.close()

def register_new_user(user: schemas.UserCreate):
    conn = get_db_connection()
    if not conn:
        return None
    hashed_password = get_password_hash(user.password)
    try:
        cursor = conn.cursor()
        conn.start_transaction()
        cursor.callproc('sp_insert_employees', [user.full_name, user.position, user.depart_id])
        employee_id = next(cursor.stored_results()).fetchone()[0]
        cursor.callproc('sp_insert_login', [user.user_name, hashed_password, employee_id])
        conn.commit()
        return get_user_by_username(user.user_name)
    except Exception as e:
        conn.rollback()
        print(f"Reg Error: {e}")
        return None
    finally:
        if conn.is_connected():
            conn.close()

def get_all_departments():
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('sp_select_department', [None])
        return next(cursor.stored_results()).fetchall()
    finally:
        if conn.is_connected():
            conn.close()

def get_assigned_kpis(employees_id: int):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('sp_select_assigned_kpis_by_employee', [employees_id])
        return next(cursor.stored_results()).fetchall()
    finally:
        if conn.is_connected():
            conn.close()

def create_kpi_result(result: schemas.KPIResultPayload, employee_id: int):
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        params = [
            employee_id,
            result.kpi_id,
            result.kpi_dividend_value,
            result.kpi_divisor_value,
            result.kpi_value,
            result.kpi_date
        ]
        cursor.callproc('sp_insert_kpi_result', params)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error creating KPI result: {e}")
        return False
    finally:
        if conn.is_connected():
            conn.close()

def get_all_kpis_with_assignments():
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('sp_select_kpi_with_assignments')
        results = next(cursor.stored_results()).fetchall()
        kpis = {}
        for row in results:
            kpi_id = row['kpi_id']
            if kpi_id not in kpis:
                kpis[kpi_id] = {
                    "id": kpi_id, "kpi_name": row['kpi_name'], "kpi_decition": row['kpi_decition'],
                    "kpi_target_value": row['kpi_target_value'], "kpi_frequency": row['kpi_frequency'],
                    "kpi_dividend": row['kpi_dividend'], "kpi_divisor": row['kpi_divisor'],
                    "assigned_employees": []
                }
            if row['employee_id']:
                employee_data = {"id": row['employee_id'], "full_name": row['employee_name'], "position": row['employee_position']}
                if employee_data not in kpis[kpi_id]['assigned_employees']:
                    kpis[kpi_id]['assigned_employees'].append(employee_data)
        return list(kpis.values())
    finally:
        if conn.is_connected():
            conn.close()

def get_kpi_results_monthly_summary(employee_id: int, start_date: date, end_date: date):
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('sp_select_kpi_results_monthly_summary', [employee_id, start_date, end_date])
        return next(cursor.stored_results()).fetchall()
    finally:
        if conn.is_connected():
            conn.close()