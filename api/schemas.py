# =================================================================
# File: schemas.py
# =================================================================
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class Department(BaseModel):
    id: int
    depart_name: str
    class Config:
        from_attributes = True

class User(BaseModel):
    id: int = Field(..., alias='employees_id')
    full_name: str
    position: Optional[str] = None
    depart_id: int
    user_name: str
    class Config:
        from_attributes = True
        allow_population_by_field_name = True

class UserCreate(BaseModel):
    user_name: str
    full_name: str
    position: Optional[str] = None
    depart_id: int
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class KPIBase(BaseModel):
    kpi_name: Optional[str] = None
    kpi_decition: Optional[str] = None
    kpi_target_value: Optional[float] = None
    kpi_frequency: Optional[str] = None
    kpi_dividend: Optional[str] = None
    kpi_divisor: Optional[str] = None

class KPICreate(KPIBase):
    kpi_name: str

class KPI(KPIBase):
    id: int
    class Config:
        from_attributes = True

class AssignedEmployee(BaseModel):
    id: int
    full_name: str
    position: Optional[str] = None
    class Config:
        from_attributes = True

class KPIWithEmployees(KPI):
    assigned_employees: List[AssignedEmployee] = []

class KPIResultPayload(BaseModel):
    kpi_id: int
    kpi_dividend_value: Optional[float] = None
    kpi_divisor_value: Optional[float] = None
    kpi_value: float
    kpi_date: date

class KPIResult(KPIResultPayload):
    create_date: datetime
    class Config:
        from_attributes = True

class KPIResultMonthlySummary(BaseModel):
    kpi_id: int
    kpi_name: str
    kpi_decition: Optional[str] = None
    kpi_target_value: Optional[float] = None
    month: date
    avg_kpi_value: float
    class Config:
        from_attributes = True
