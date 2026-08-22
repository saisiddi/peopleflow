"""Dayflow HRMS — FastAPI backend (hackathon build).

Auth is delegated to Supabase Auth: the frontend signs in with supabase-js
and sends the user's access token as a Bearer token. We validate it by
calling supabase.auth.get_user(token) and load the matching profile row.
All DB access uses the service-role key (backend is the trust boundary).
"""
import os
import threading
import time
from datetime import date, datetime, timedelta, timezone
from math import atan2, cos, radians, sin, sqrt
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GRACE_MINUTES = int(os.environ.get("GEOFENCE_EXIT_GRACE_MINUTES", "15"))
MIN_FULL_DAY_HOURS = 4  # exit sooner than this after entry = half_day
ADMIN_SIGNUP_CODE = os.environ.get("ADMIN_SIGNUP_CODE", "dayflow-hr-admin")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Dayflow HRMS API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon: lock down post-demo
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lng2 - lng1)
    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def get_current_user(authorization: str = Header(...)) -> dict:
    """Validate Supabase JWT and return (user, profile)."""
    token = authorization.replace("Bearer ", "")
    try:
        resp = sb.auth.get_user(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    if not resp.user:
        raise HTTPException(401, "Invalid or expired token")
    profile = (
        sb.table("profiles").select("*").eq("id", resp.user.id).single().execute()
    ).data
    if not profile:
        raise HTTPException(403, "No profile for user")
    profile["access_token"] = token
    return profile


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return user


def get_or_create_attendance(employee_id: str, day: date) -> dict:
    row = (
        sb.table("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("date", day.isoformat())
        .maybe_single()
        .execute()
    )
    # maybe_single() returns None (not a response) when no row exists
    if row is not None and getattr(row, "data", None):
        return row.data
    created = (
        sb.table("attendance")
        .insert({"employee_id": employee_id, "date": day.isoformat(), "status": "absent"})
        .execute()
    )
    return created.data[0]


def get_office() -> dict:
    return (sb.table("office_location").select("*").eq("id", 1).single().execute()).data


def parse_ts(value: str):
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def finalize_exit(row: dict) -> str:
    """Close out an attendance row: exit_time = when the geofence was left,
    status = half_day if fewer than MIN_FULL_DAY_HOURS were worked."""
    exit_at = parse_ts(row["left_geofence_at"])
    status = "present"
    if row.get("entry_time"):
        worked = (exit_at - parse_ts(row["entry_time"])).total_seconds() / 3600
        if worked < MIN_FULL_DAY_HOURS:
            status = "half_day"
    sb.table("attendance").update(
        {"exit_time": exit_at.isoformat(), "status": status}
    ).eq("id", row["id"]).execute()
    return status


def finalize_stale_pending_exits() -> int:
    """Server-side safety net: close out pending_exit rows past the grace window."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=GRACE_MINUTES)
    rows = (
        sb.table("attendance")
        .select("*")
        .eq("status", "pending_exit")
        .lt("left_geofence_at", cutoff.isoformat())
        .execute()
    ).data
    for r in rows:
        finalize_exit(r)
    return len(rows)


# ---------- schemas ----------

class SignUpIn(BaseModel):
    email: str
    password: str
    full_name: str
    employee_id: str
    role: str = "employee"  # 'employee' | 'admin'
    admin_code: Optional[str] = None


class ProfilePatch(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None


class EntrySimulateIn(BaseModel):
    employee_id: str


class GeofencePingIn(BaseModel):
    lat: float
    lng: float


class LeaveApplyIn(BaseModel):
    leave_type: str  # paid | sick | unpaid
    start_date: date
    end_date: date
    remarks: Optional[str] = None


class LeaveReviewIn(BaseModel):
    status: str  # approved | rejected
    admin_comment: Optional[str] = None


class PayrollPatch(BaseModel):
    base_salary: Optional[float] = None
    allowances: Optional[float] = None
    deductions: Optional[float] = None


class OfficeLocationIn(BaseModel):
    lat: float
    lng: float
    radius_meters: int = 150


# ---------- auth ----------

@app.post("/auth/signup")
def signup(body: SignUpIn):
    if body.role not in ("employee", "admin"):
        raise HTTPException(400, "role must be employee or admin")
    if body.role == "admin" and body.admin_code != ADMIN_SIGNUP_CODE:
        raise HTTPException(403, "Invalid admin signup code")
    try:
        resp = sb.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,  # demo: skip email verification wait
                "user_metadata": {"full_name": body.full_name},
            }
        )
    except Exception as e:
        raise HTTPException(400, f"Signup failed: {e}")
    uid = resp.user.id
    sb.table("profiles").update(
        {
            "employee_id": body.employee_id,
            "full_name": body.full_name,
            "role": body.role,
        }
    ).eq("id", uid).execute()
    # seed a payroll row for the current month
    now = datetime.now()
    sb.table("payroll").insert(
        {
            "employee_id": uid,
            "base_salary": 50000,
            "allowances": 5000,
            "deductions": 2000,
            "net_salary": 53000,
            "month": now.strftime("%B"),
            "year": now.year,
        }
    ).execute()
    return {"id": uid, "message": "Signed up. You can now sign in."}


# ---------- profiles ----------

@app.get("/profiles/me")
def my_profile(user: dict = Depends(get_current_user)):
    user.pop("access_token", None)
    return user


@app.patch("/profiles/me")
def patch_my_profile(body: ProfilePatch, user: dict = Depends(get_current_user)):
    # employees may only touch these fields
    allowed = {"phone", "address", "profile_picture_url"}
    data = body.dict(exclude_none=True)
    if user["role"] != "admin":
        data = {k: v for k, v in data.items() if k in allowed}
    sb.table("profiles").update(data).eq("id", user["id"]).execute()
    return {"ok": True}


@app.get("/profiles")
def list_profiles(user: dict = Depends(require_admin)):
    return sb.table("profiles").select("*").order("full_name").execute().data


@app.get("/profiles/{profile_id}")
def get_profile(profile_id: str, user: dict = Depends(require_admin)):
    return sb.table("profiles").select("*").eq("id", profile_id).single().execute().data


@app.patch("/profiles/{profile_id}")
def patch_profile(profile_id: str, body: ProfilePatch, user: dict = Depends(require_admin)):
    data = body.dict(exclude_none=True)
    sb.table("profiles").update(data).eq("id", profile_id).execute()
    return {"ok": True}


# ---------- attendance ----------

@app.post("/attendance/entry-simulate")
def simulate_entry(body: EntrySimulateIn, user: dict = Depends(require_admin)):
    """Demo stand-in for the company's existing fingerprint scanner webhook."""
    row = get_or_create_attendance(body.employee_id, date.today())
    now = datetime.now(timezone.utc)
    # a fresh punch resets any earlier exit (same-day re-entry support)
    sb.table("attendance").update(
        {
            "entry_time": now.isoformat(),
            "entry_source": "fingerprint_simulated",
            "status": "present",
            "exit_time": None,
            "left_geofence_at": None,
            "last_seen_inside_geofence_at": now.isoformat(),
        }
    ).eq("id", row["id"]).execute()
    return {"ok": True, "message": "Fingerprint entry recorded"}


@app.post("/attendance/geofence-ping")
def geofence_ping(body: GeofencePingIn, user: dict = Depends(get_current_user)):
    """Employee browser polls us with its GPS position every ~60-90s."""
    office = get_office()
    dist = haversine_distance(body.lat, body.lng, office["lat"], office["lng"])
    inside = dist <= office["radius_meters"]
    now = datetime.now(timezone.utc)
    row = get_or_create_attendance(user["id"], date.today())

    update = {"last_seen_lat": body.lat, "last_seen_lng": body.lng}

    if not row.get("entry_time"):
        # no entry yet — nothing to track
        sb.table("attendance").update(update).eq("id", row["id"]).execute()
        return {"state": "not_checked_in", "distance_m": round(dist)}

    if inside:
        update["last_seen_inside_geofence_at"] = now.isoformat()
        if row["status"] == "pending_exit":
            # came back inside before the grace timer expired — false alarm
            update["status"] = "present"
            update["left_geofence_at"] = None
            sb.table("attendance").update(update).eq("id", row["id"]).execute()
            return {"state": "present", "distance_m": round(dist), "returned": True}
        sb.table("attendance").update(update).eq("id", row["id"]).execute()
        return {"state": "present", "distance_m": round(dist)}

    # outside the geofence
    if row.get("exit_time"):
        return {"state": "checked_out", "distance_m": round(dist)}

    if row["status"] != "pending_exit":
        # first outside reading — start the grace timer
        update["status"] = "pending_exit"
        update["left_geofence_at"] = now.isoformat()
        sb.table("attendance").update(update).eq("id", row["id"]).execute()
        return {
            "state": "pending_exit",
            "distance_m": round(dist),
            "grace_minutes": GRACE_MINUTES,
            "confirm_by": (now + timedelta(minutes=GRACE_MINUTES)).isoformat(),
        }

    # already pending — check if grace window has elapsed
    left_at = parse_ts(row["left_geofence_at"])
    if now - left_at >= timedelta(minutes=GRACE_MINUTES):
        status = finalize_exit(row)
        return {"state": "checked_out", "distance_m": round(dist), "exit_time": left_at.isoformat(), "status": status}
    return {
        "state": "pending_exit",
        "distance_m": round(dist),
        "grace_minutes": GRACE_MINUTES,
        "confirm_by": (left_at + timedelta(minutes=GRACE_MINUTES)).isoformat(),
    }


@app.get("/attendance/me")
def my_attendance(user: dict = Depends(get_current_user)):
    return (
        sb.table("attendance")
        .select("*")
        .eq("employee_id", user["id"])
        .order("date", desc=True)
        .limit(30)
        .execute()
        .data
    )


@app.get("/attendance/all")
def all_attendance(user: dict = Depends(require_admin)):
    return (
        sb.table("attendance")
        .select("*, profiles(full_name, employee_id)")
        .order("date", desc=True)
        .limit(200)
        .execute()
        .data
    )


@app.get("/attendance/{employee_id}")
def employee_attendance(employee_id: str, user: dict = Depends(require_admin)):
    return (
        sb.table("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .order("date", desc=True)
        .limit(30)
        .execute()
        .data
    )


@app.post("/attendance/finalize-pending")
def finalize_pending(user: dict = Depends(require_admin)):
    n = finalize_stale_pending_exits()
    return {"finalized": n}


# ---------- leave ----------

@app.post("/leave/apply")
def apply_leave(body: LeaveApplyIn, user: dict = Depends(get_current_user)):
    if body.leave_type not in ("paid", "sick", "unpaid"):
        raise HTTPException(400, "Invalid leave type")
    if body.end_date < body.start_date:
        raise HTTPException(400, "end_date before start_date")
    sb.table("leave_requests").insert(
        {
            "employee_id": user["id"],
            "leave_type": body.leave_type,
            "start_date": body.start_date.isoformat(),
            "end_date": body.end_date.isoformat(),
            "remarks": body.remarks,
            "status": "pending",
        }
    ).execute()
    return {"ok": True}


@app.get("/leave/me")
def my_leaves(user: dict = Depends(get_current_user)):
    return (
        sb.table("leave_requests")
        .select("*")
        .eq("employee_id", user["id"])
        .order("created_at", desc=True)
        .execute()
        .data
    )


@app.get("/leave/all")
def all_leaves(user: dict = Depends(require_admin)):
    return (
        sb.table("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(full_name, employee_id)")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@app.patch("/leave/{leave_id}/review")
def review_leave(leave_id: str, body: LeaveReviewIn, user: dict = Depends(require_admin)):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "status must be approved or rejected")
    lr = (
        sb.table("leave_requests").select("*").eq("id", leave_id).single().execute()
    ).data
    sb.table("leave_requests").update(
        {
            "status": body.status,
            "admin_comment": body.admin_comment,
            "reviewed_by": user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", leave_id).execute()

    # approved leave marks attendance rows as on_leave for the range
    if body.status == "approved":
        d = date.fromisoformat(lr["start_date"])
        end = date.fromisoformat(lr["end_date"])
        while d <= end:
            row = get_or_create_attendance(lr["employee_id"], d)
            sb.table("attendance").update({"status": "on_leave"}).eq("id", row["id"]).execute()
            d += timedelta(days=1)
    else:
        # rejection must undo on_leave marks — unless another approved leave still covers the date
        d = date.fromisoformat(lr["start_date"])
        end = date.fromisoformat(lr["end_date"])
        while d <= end:
            other_approved = (
                sb.table("leave_requests")
                .select("id")
                .eq("employee_id", lr["employee_id"])
                .eq("status", "approved")
                .neq("id", leave_id)
                .lte("start_date", d.isoformat())
                .gte("end_date", d.isoformat())
                .execute()
                .data
            )
            if not other_approved:
                row = (
                    sb.table("attendance")
                    .select("*")
                    .eq("employee_id", lr["employee_id"])
                    .eq("date", d.isoformat())
                    .maybe_single()
                    .execute()
                )
                att = row.data if row is not None and getattr(row, "data", None) else None
                if att and att["status"] == "on_leave" and not att.get("entry_time"):
                    sb.table("attendance").update({"status": "absent"}).eq("id", att["id"]).execute()
            d += timedelta(days=1)
    return {"ok": True}


# ---------- payroll ----------

@app.get("/payroll/me")
def my_payroll(user: dict = Depends(get_current_user)):
    now = datetime.now()
    return (
        sb.table("payroll")
        .select("*")
        .eq("employee_id", user["id"])
        .eq("year", now.year)
        .order("month", desc=True)
        .execute()
        .data
    )


@app.get("/payroll/{employee_id}")
def employee_payroll(employee_id: str, user: dict = Depends(require_admin)):
    return (
        sb.table("payroll")
        .select("*, profiles!payroll_employee_id_fkey(full_name, employee_id)")
        .eq("employee_id", employee_id)
        .order("year", desc=True)
        .execute()
        .data
    )


@app.patch("/payroll/{employee_id}")
def patch_payroll(employee_id: str, body: PayrollPatch, user: dict = Depends(require_admin)):
    rows = sb.table("payroll").select("*").eq("employee_id", employee_id).execute().data
    base = body.base_salary if body.base_salary is not None else float(rows[0]["base_salary"] or 0) if rows else 0
    allow = body.allowances if body.allowances is not None else float(rows[0]["allowances"] or 0) if rows else 0
    ded = body.deductions if body.deductions is not None else float(rows[0]["deductions"] or 0) if rows else 0
    net = base + allow - ded
    now = datetime.now()
    if not rows:
        # users signed up before payroll seeding (e.g. early Google users) — create now
        sb.table("payroll").insert(
            {
                "employee_id": employee_id,
                "base_salary": base,
                "allowances": allow,
                "deductions": ded,
                "net_salary": net,
                "month": now.strftime("%B"),
                "year": now.year,
                "updated_by": user["id"],
            }
        ).execute()
    else:
        sb.table("payroll").update(
            {
                "base_salary": base,
                "allowances": allow,
                "deductions": ded,
                "net_salary": net,
                "updated_by": user["id"],
            }
        ).eq("id", rows[0]["id"]).execute()
    return {"ok": True, "net_salary": net}


# ---------- office geofence ----------

@app.get("/office-location")
def get_office_location(user: dict = Depends(get_current_user)):
    return get_office()


@app.patch("/office-location")
def update_office_location(body: OfficeLocationIn, user: dict = Depends(require_admin)):
    if not (50 <= body.radius_meters <= 2000):
        raise HTTPException(400, "radius_meters must be between 50 and 2000")
    sb.table("office_location").update(
        {"lat": body.lat, "lng": body.lng, "radius_meters": body.radius_meters}
    ).eq("id", 1).execute()
    return {"ok": True}


# ---------- background finalize loop (cron substitute for the demo) ----------

def _finalize_loop():
    while True:
        try:
            finalize_stale_pending_exits()
        except Exception:
            pass
        time.sleep(300)  # every 5 min


@app.on_event("startup")
def start_background():
    threading.Thread(target=_finalize_loop, daemon=True).start()


@app.get("/health")
def health():
    return {"ok": True, "service": "dayflow-api"}
