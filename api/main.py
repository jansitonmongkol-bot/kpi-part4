# =================================================================
# File: main.py
# =================================================================
from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from datetime import date, datetime
import crud, schemas, auth, uvicorn
import re # Import regular expression module for password complexity

app = FastAPI(title="KPI Management API", version="2.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register/", response_model=schemas.User, tags=["Authentication"], status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate):
    # --- เพิ่ม Input Validation สำหรับ Register ---
    # ตรวจสอบความยาวของ Username
    if len(user.user_name) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long"
        )
    
    # ตรวจสอบ Full Name ไม่ให้เป็นค่าว่าง
    if not user.full_name or len(user.full_name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty"
        )

    # ตรวจสอบความยาวของ Password
    if len(user.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # ตรวจสอบความซับซ้อนของ Password (ต้องมีตัวเลข, พิมพ์ใหญ่, พิมพ์เล็ก, อักขระพิเศษ)
    if not re.search(r"\d", user.password): # ตรวจสอบตัวเลข
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one digit"
        )
    if not re.search(r"[A-Z]", user.password): # ตรวจสอบตัวอักษรพิมพ์ใหญ่
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )
    if not re.search(r"[a-z]", user.password): # ตรวจสอบตัวอักษรพิมพ์เล็ก
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter"
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", user.password): # ตรวจสอบอักขระพิเศษ
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character (!@#$%^&*(),.?)",
        )
    # --- สิ้นสุด Input Validation สำหรับ Register ---

    if crud.get_user_by_username(user.user_name):
        raise HTTPException(status_code=400, detail="Username already registered")
    created_user = crud.register_new_user(user=user)
    if not created_user:
        raise HTTPException(status_code=500, detail="Failed to register")
    return created_user

@app.post("/token", response_model=schemas.Token, tags=["Authentication"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), remember_me: bool = Form(False)):
    # --- เพิ่ม Input Validation สำหรับ Username และ Password ---
    username = form_data.username
    password = form_data.password

    # ตรวจสอบความยาวของ Username
    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # ตรวจสอบความยาวของ Password
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # ตรวจสอบความซับซ้อนของ Password (ต้องมีตัวเลข, พิมพ์ใหญ่, พิมพ์เล็ก, อักขระพิเศษ)
    if not re.search(r"\d", password): # ตรวจสอบตัวเลข
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one digit",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not re.search(r"[A-Z]", password): # ตรวจสอบตัวอักษรพิมพ์ใหญ่
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not re.search(r"[a-z]", password): # ตรวจสอบตัวอักษรพิมพ์เล็ก
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): # ตรวจสอบอักขระพิเศษ
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character (!@#$%^&*(),.?)",
            headers={"WWW-Authenticate": "Bearer"}
        )
    # --- สิ้นสุด Input Validation ---

    user = crud.get_user_by_username(username)
    if not user or not auth.verify_password(password, user['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = auth.create_access_token(data={"sub": user['user_name']}, remember_me=remember_me)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User, tags=["Users"])
async def read_users_me(current_user: dict = Depends(auth.get_current_user)):
    return current_user

@app.get("/departments/", response_model=List[schemas.Department], tags=["Departments"])
def read_all_departments():
    return crud.get_all_departments()

@app.get("/users/me/kpis/", response_model=List[schemas.KPI], tags=["Users"])
def read_my_assigned_kpis(current_user: dict = Depends(auth.get_current_user)):
    employee_id = current_user['id']
    return crud.get_assigned_kpis(employees_id=employee_id)

@app.post("/kpi-results/", status_code=status.HTTP_201_CREATED, tags=["KPI Management"])
def record_kpi_result(result_payload: schemas.KPIResultPayload, current_user: dict = Depends(auth.get_current_user)):
    employee_id = current_user['id']
    success = crud.create_kpi_result(result=result_payload, employee_id=employee_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to record KPI result")
    return {"message": "KPI result recorded successfully"}

@app.get("/kpi-results/by-year/", response_model=List[schemas.KPIResultMonthlySummary], tags=["KPI Management"])
def search_kpi_results_by_year(
    year: int,
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Get KPI results for a specific year.
    """
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    employee_id = current_user['id']
    results = crud.get_kpi_results_monthly_summary(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date
    )
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No results found for this year")
    return results

@app.get("/kpi-results/multi-year-monthly-summary/", response_model=List[schemas.KPIResultMonthlySummary], tags=["KPI Management"])
def get_multi_year_monthly_kpi_summary(
    start_year: int,
    end_year: int,
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Get monthly KPI results summary across multiple years for a single employee.
    """
    if start_year > end_year:
        raise HTTPException(status_code=400, detail="start_year cannot be greater than end_year")
    
    start_date = date(start_year, 1, 1)
    end_date = date(end_year, 12, 31)
    
    employee_id = current_user['id']
    results = crud.get_kpi_results_monthly_summary(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date
    )
    return results

@app.get("/kpi-results/", response_model=List[schemas.KPIResultMonthlySummary], tags=["KPI Management"])
def search_kpi_results_by_date_range(
    start_date: date,
    end_date: date,
    current_user: dict = Depends(auth.get_current_user)
):
    employee_id = current_user['id']
    results = crud.get_kpi_results_monthly_summary(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date
    )
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No results found for this date range")
    return results

@app.get("/kpi/", response_model=List[schemas.KPIWithEmployees], tags=["KPI Management"])
def read_all_kpis_with_assignments(current_user: dict = Depends(auth.get_current_user)):
    return crud.get_all_kpis_with_assignments()

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the KPI Management API V2.6"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="192.168.1.41", port=8000,log_level="debug",reload=True)
