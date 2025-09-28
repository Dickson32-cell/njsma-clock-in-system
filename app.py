from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, time, timedelta
import os
import math

# For handling CORS in production
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for production deployment
CORS(app, origins=["*"])

# Database configuration - Use environment variable for production
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Handle Render's PostgreSQL URL format and specify psycopg driver
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+psycopg://', 1)
    elif database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Development database (SQLite)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///clock_in_system.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=True)  # Department or Unit
    email = db.Column(db.String(120), nullable=True)  # For email notifications
    contact = db.Column(db.String(20), nullable=True)  # Phone/contact number
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    date_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)  # For soft delete (transfers/inactive staff)

class AttendanceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    clock_in_time = db.Column(db.DateTime, nullable=False)
    clock_out_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="present")  # present, absent, late
    location = db.Column(db.String(100), default="EN-010-4770")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    date_only = db.Column(db.Date, nullable=False)  # For daily attendance tracking

    def __init__(self, employee_id, clock_in_time, **kwargs):
        super(AttendanceLog, self).__init__(**kwargs)
        self.employee_id = employee_id
        self.clock_in_time = clock_in_time
        self.date_only = clock_in_time.date()

class LeaveRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Settings Models
class SystemSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(50), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(30), nullable=False)  # attendance, location, organization, security, preferences
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(100), default="system")

# Email Notification Log
class EmailNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    notification_type = db.Column(db.String(30), nullable=False)  # 'clock_in_reminder', 'absence_alert', 'late_arrival'
    email_sent = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    message_content = db.Column(db.Text, nullable=True)

# Staff Analytics Log
class StaffAnalytics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    action_type = db.Column(db.String(30), nullable=False)  # 'added', 'transferred', 'deleted', 'modified'
    action_date = db.Column(db.DateTime, default=datetime.utcnow)
    performed_by = db.Column(db.String(100), nullable=False)  # HR email
    details = db.Column(db.Text, nullable=True)  # JSON string with change details

# Helper functions
def validate_gps_location(lat, lon):
    """Validate if coordinates are within EN-010-4770 area (Assembly premises)"""
    # Assembly coordinates (example for New Juaben South Municipal Assembly)
    assembly_lat = 6.673
    assembly_lon = -0.520
    max_distance = 0.5  # 500 meters radius
    
    # Calculate distance using Haversine formula
    R = 6371000  # Earth radius in meters
    lat1_rad = math.radians(lat)
    lat2_rad = math.radians(assembly_lat)
    delta_lat = math.radians(assembly_lat - lat)
    delta_lon = math.radians(assembly_lon - lon)
    
    a = (math.sin(delta_lat/2)**2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c / 1000  # Convert to kilometers
    
    return distance <= max_distance, distance

def is_after_10am(datetime_obj):
    """Check if time is after 10:00 AM"""
    cutoff_time = time(10, 0)  # 10:00 AM
    return datetime_obj.time() > cutoff_time

def initialize_default_settings():
    """Initialize default system settings if they don't exist"""
    default_settings = [
        {
            'setting_key': 'require_gps_verification',
            'setting_value': 'true',
            'category': 'security',
            'updated_by': 'system'
        },
        {
            'setting_key': 'gps_verification_radius',
            'setting_value': '0.5',
            'category': 'security',
            'updated_by': 'system'
        },
        {
            'setting_key': 'assembly_latitude',
            'setting_value': '6.673',
            'category': 'location',
            'updated_by': 'system'
        },
        {
            'setting_key': 'assembly_longitude',
            'setting_value': '-0.520',
            'category': 'location',
            'updated_by': 'system'
        },
        {
            'setting_key': 'clock_in_deadline',
            'setting_value': '10:00',
            'category': 'attendance',
            'updated_by': 'system'
        }
    ]
    
    for setting in default_settings:
        existing = SystemSettings.query.filter_by(setting_key=setting['setting_key']).first()
        if not existing:
            new_setting = SystemSettings(
                setting_key=setting['setting_key'],
                setting_value=setting['setting_value'],
                category=setting['category'],
                updated_by=setting['updated_by']
            )
            db.session.add(new_setting)
    
    try:
        db.session.commit()
        print("Default system settings initialized")
    except Exception as e:
        db.session.rollback()
        print(f"Error initializing settings: {e}")

def mark_daily_absences():
    """Mark employees as absent if they didn't clock in by 10 AM"""
    today = date.today()
    cutoff_datetime = datetime.combine(today, time(10, 0))
    
    if datetime.now() > cutoff_datetime:
        # Get all employees
        all_employees = Employee.query.all()
        
        # Get employees who clocked in today
        clocked_in_today = db.session.query(AttendanceLog.employee_id).filter(
            AttendanceLog.date_only == today
        ).distinct().all()
        
        clocked_in_ids = [record[0] for record in clocked_in_today]
        
        # Mark absent employees
        for employee in all_employees:
            if employee.employee_id not in clocked_in_ids:
                absent_log = AttendanceLog(
                    employee_id=employee.employee_id,
                    clock_in_time=cutoff_datetime,
                    status="absent",
                    location="Not reported"
                )
                db.session.add(absent_log)
        
        db.session.commit()

# Create Database Tables
with app.app_context():
    db.create_all()

# Serve static files from clock-in-system directory
@app.route('/')
def home():
    return send_from_directory('clock-in-system', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('clock-in-system', filename)

# API Routes
@app.route('/api/clock-in', methods=['POST'])
def clock_in():
    data = request.get_json()
    employee_id = data.get('employeeId')
    clock_in_time = data.get('clockInTime')
    
    # Handle location data from frontend
    location_data = data.get('location', {})
    latitude = location_data.get('latitude')
    longitude = location_data.get('longitude')
    accuracy = location_data.get('accuracy')

    if not employee_id or not clock_in_time:
        return jsonify({"error": "Missing employee ID or time"}), 400
    
    # Check if GPS verification is enabled
    gps_setting = SystemSettings.query.filter_by(
        setting_key='require_gps_verification'
    ).first()
    
    gps_required = True  # Default to required
    if gps_setting:
        gps_required = gps_setting.setting_value.lower() == 'true'
    
    if gps_required:
        if not latitude or not longitude:
            return jsonify({"error": "GPS location is required for clock-in"}), 400

        # Validate GPS location
        is_valid_location, distance = validate_gps_location(float(latitude), float(longitude))
        if not is_valid_location:
            return jsonify({
                "error": f"You are not within the Assembly premises (EN-010-4770). Distance: {distance:.2f} km"
            }), 403

    # Check if employee exists
    employee = Employee.query.filter_by(employee_id=employee_id).first()
    if not employee:
        return jsonify({"error": "Employee not found. Please contact HR to register."}), 404

    try:
        # Parse the datetime string
        clock_time = datetime.fromisoformat(clock_in_time.replace('T', ' '))
        
        # Check if it's after 10:00 AM
        if is_after_10am(clock_time):
            return jsonify({
                "error": "Clock-in deadline has passed! Staff must clock in before 10:00 AM. You are marked as absent for today."
            }), 400
        
        # Check if already clocked in today
        today = clock_time.date()
        existing_attendance = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date_only=today
        ).first()
        
        if existing_attendance:
            return jsonify({
                "error": f"You have already clocked in today at {existing_attendance.clock_in_time.strftime('%I:%M %p')}"
            }), 400
        
        # Create attendance log
        attendance = AttendanceLog(
            employee_id=employee_id,
            clock_in_time=clock_time,
            status="present",
            location="EN-010-4770 (Assembly Premises)"
        )
        db.session.add(attendance)
        db.session.commit()

        return jsonify({
            "message": f"Clock-in successful for {employee.name} at {clock_time.strftime('%I:%M %p')}! Location verified within Assembly premises.",
            "employee_name": employee.name,
            "employee_id": employee_id,
            "location": "EN-010-4770",
            "status": "present"
        }), 200

    except ValueError as e:
        return jsonify({"error": "Invalid time format"}), 400
    except Exception as e:
        return jsonify({"error": f"An error occurred processing your request: {str(e)}"}), 500

@app.route('/api/clock-out', methods=['POST'])
def clock_out():
    data = request.get_json()
    employee_id = data.get('employeeId')
    clock_out_time = data.get('clockOutTime')

    if not employee_id or not clock_out_time:
        return jsonify({"error": "Missing employee ID or time"}), 400

    # Check if employee exists
    employee = Employee.query.filter_by(employee_id=employee_id).first()
    if not employee:
        return jsonify({"error": "Employee not found. Please contact HR to register."}), 404

    try:
        # Parse the datetime string
        clock_out_datetime = datetime.fromisoformat(clock_out_time.replace('T', ' '))
        today = clock_out_datetime.date()
        
        # Find today's attendance record for this employee
        attendance_record = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date_only=today
        ).first()
        
        if not attendance_record:
            return jsonify({
                "error": "No clock-in record found for today. Please clock in first before clocking out."
            }), 400
        
        if attendance_record.clock_out_time:
            return jsonify({
                "error": f"You have already clocked out today at {attendance_record.clock_out_time.strftime('%I:%M %p')}"
            }), 400
        
        # Validate clock-out time is after clock-in time
        if clock_out_datetime <= attendance_record.clock_in_time:
            return jsonify({
                "error": "Clock-out time must be after your clock-in time"
            }), 400
        
        # Update the attendance record with clock-out time
        attendance_record.clock_out_time = clock_out_datetime
        db.session.commit()
        
        # Calculate work duration
        work_duration = clock_out_datetime - attendance_record.clock_in_time
        hours = int(work_duration.total_seconds() // 3600)
        minutes = int((work_duration.total_seconds() % 3600) // 60)
        
        return jsonify({
            "message": f"Clock-out successful for {employee.name} at {clock_out_datetime.strftime('%I:%M %p')}!",
            "employee_name": employee.name,
            "employee_id": employee_id,
            "clock_in_time": attendance_record.clock_in_time.strftime('%I:%M %p'),
            "clock_out_time": clock_out_datetime.strftime('%I:%M %p'),
            "work_duration": f"{hours} hours and {minutes} minutes",
            "status": "completed"
        }), 200

    except ValueError as e:
        return jsonify({"error": "Invalid time format"}), 400
    except Exception as e:
        return jsonify({"error": f"An error occurred processing your request: {str(e)}"}), 500

@app.route('/api/status/<employee_id>', methods=['GET'])
def check_employee_status(employee_id):
    """Check if an employee has clocked in today and their current status"""
    try:
        # Check if employee exists
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        
        # Check today's attendance record
        today = date.today()
        attendance_record = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date_only=today
        ).first()
        
        if not attendance_record:
            return jsonify({
                "employee_name": employee.name,
                "employee_id": employee_id,
                "status": "not_clocked_in",
                "can_clock_in": True,
                "can_clock_out": False,
                "message": "Employee has not clocked in today"
            }), 200
        
        if attendance_record.clock_out_time:
            return jsonify({
                "employee_name": employee.name,
                "employee_id": employee_id,
                "status": "completed",
                "can_clock_in": False,
                "can_clock_out": False,
                "clock_in_time": attendance_record.clock_in_time.strftime('%I:%M %p'),
                "clock_out_time": attendance_record.clock_out_time.strftime('%I:%M %p'),
                "message": "Employee has completed attendance for today"
            }), 200
        
        else:
            return jsonify({
                "employee_name": employee.name,
                "employee_id": employee_id,
                "status": "clocked_in",
                "can_clock_in": False,
                "can_clock_out": True,
                "clock_in_time": attendance_record.clock_in_time.strftime('%I:%M %p'),
                "message": "Employee is clocked in and can now clock out"
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/leave-request', methods=['POST'])
def submit_leave_request():
    data = request.get_json()
    employee_id = data.get('employeeId')
    start_date = data.get('startDate')
    end_date = data.get('endDate')

    if not employee_id or not start_date or not end_date:
        return jsonify({"error": "Missing required fields"}), 400

    employee = Employee.query.filter_by(employee_id=employee_id).first()
    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    try:
        leave_request = LeaveRequest(
            employee_id=employee_id,
            start_date=datetime.strptime(start_date, "%Y-%m-%d").date(),
            end_date=datetime.strptime(end_date, "%Y-%m-%d").date()
        )
        db.session.add(leave_request)
        db.session.commit()

        return jsonify({
            "message": f"Leave request submitted successfully for {employee.name}",
            "request_id": leave_request.id
        }), 201

    except ValueError as e:
        return jsonify({"error": "Invalid date format"}), 400
    except Exception as e:
        return jsonify({"error": "An error occurred processing your request"}), 500

@app.route('/api/staff', methods=['POST'])
def add_staff():
    data = request.get_json()
    staff_list = data.get('staff', [])
    hr_email = data.get('hr_email', 'system')  # Track who performed the action
    
    if not staff_list:
        return jsonify({"error": "No staff data provided"}), 400
    
    if len(staff_list) > 1000:
        return jsonify({"error": "Too many records. Please upload in batches of 1000 or fewer."}), 400
    
    try:
        added_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []
        
        for index, staff in enumerate(staff_list):
            try:
                # Enhanced data extraction for new format
                employee_id = staff.get('staffId', '').strip()
                name = staff.get('name', '').strip()
                department = staff.get('department', '').strip() or staff.get('unit', '').strip()
                email = staff.get('email', '').strip()
                contact = staff.get('contact', '').strip()
                
                # Validate required fields
                if not employee_id or not name:
                    errors.append(f"Record {index + 1}: Missing employee ID or name")
                    skipped_count += 1
                    continue
                
                # Validate employee ID format and length
                if len(employee_id) < 3 or len(employee_id) > 20:
                    errors.append(f"Record {index + 1}: Employee ID '{employee_id}' must be 3-20 characters")
                    skipped_count += 1
                    continue
                
                # Validate name length
                if len(name) < 2 or len(name) > 100:
                    errors.append(f"Record {index + 1}: Name '{name}' must be 2-100 characters")
                    skipped_count += 1
                    continue
                
                # Validate email format if provided
                if email and '@' not in email:
                    errors.append(f"Record {index + 1}: Invalid email format '{email}'")
                    skipped_count += 1
                    continue
                
                # Check for invalid characters in employee ID
                if not employee_id.replace('-', '').replace('_', '').replace('.', '').isalnum():
                    errors.append(f"Record {index + 1}: Employee ID '{employee_id}' contains invalid characters")
                    skipped_count += 1
                    continue
                
                # Check if employee already exists
                existing = Employee.query.filter_by(employee_id=employee_id).first()
                if existing:
                    # Update existing employee data if different
                    changes = []
                    if existing.name != name:
                        existing.name = name
                        changes.append(f"name: {existing.name} -> {name}")
                    if existing.department != department:
                        existing.department = department
                        changes.append(f"department: {existing.department} -> {department}")
                    if existing.email != email:
                        existing.email = email
                        changes.append(f"email: {existing.email} -> {email}")
                    if existing.contact != contact:
                        existing.contact = contact
                        changes.append(f"contact: {existing.contact} -> {contact}")
                    
                    if changes:
                        existing.date_modified = datetime.utcnow()
                        
                        # Log analytics for modification
                        analytics_log = StaffAnalytics(
                            employee_id=employee_id,
                            action_type='modified',
                            performed_by=hr_email,
                            details=f"Updated: {', '.join(changes)}"
                        )
                        db.session.add(analytics_log)
                        updated_count += 1
                    else:
                        skipped_count += 1
                else:
                    # Create new employee with all fields
                    new_employee = Employee(
                        employee_id=employee_id,
                        name=name,
                        department=department,
                        email=email,
                        contact=contact,
                        is_active=True
                    )
                    
                    db.session.add(new_employee)
                    
                    # Log analytics for new addition
                    analytics_log = StaffAnalytics(
                        employee_id=employee_id,
                        action_type='added',
                        performed_by=hr_email,
                        details=f"New staff added: {name}, Department: {department}"
                    )
                    db.session.add(analytics_log)
                    added_count += 1
                    
            except Exception as record_error:
                errors.append(f"Record {index + 1}: {str(record_error)}")
                skipped_count += 1
                continue
        
        # Commit all changes if no critical errors
        if added_count > 0 or updated_count > 0:
            db.session.commit()
        
        # Prepare response message
        result_parts = []
        if added_count > 0:
            result_parts.append(f"{added_count} new staff members added")
        if updated_count > 0:
            result_parts.append(f"{updated_count} existing staff members updated")
        if skipped_count > 0:
            result_parts.append(f"{skipped_count} records skipped")
        
        message = "Upload completed: " + ", ".join(result_parts)
        
        response_data = {
            "message": message,
            "added_count": added_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "total_processed": len(staff_list)
        }
        
        # Include errors if any (but still return success if some records were processed)
        if errors:
            response_data["errors"] = errors[:10]  # Limit to first 10 errors
            if len(errors) > 10:
                response_data["additional_errors"] = len(errors) - 10
        
        # Return appropriate status code
        if added_count == 0 and updated_count == 0:
            return jsonify({
                "error": "No staff members were added or updated",
                "details": response_data
            }), 400
        else:
            return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": f"Database error occurred: {str(e)}",
            "details": "Please check your data and try again. Contact system administrator if the problem persists."
        }), 500

@app.route('/api/attendance-report', methods=['GET'])
def get_attendance_report():
    try:
        # Get query parameters for filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        employee_id = request.args.get('employee_id')
        status = request.args.get('status')
        
        query = db.session.query(AttendanceLog, Employee).join(Employee)
        
        # Apply filters
        if start_date:
            query = query.filter(AttendanceLog.date_only >= datetime.strptime(start_date, "%Y-%m-%d").date())
        if end_date:
            query = query.filter(AttendanceLog.date_only <= datetime.strptime(end_date, "%Y-%m-%d").date())
        if employee_id:
            query = query.filter(AttendanceLog.employee_id == employee_id)
        if status:
            query = query.filter(AttendanceLog.status == status)
        
        logs = query.all()
        result = [
            {
                "employee_id": log.employee_id,
                "employee_name": employee.name,
                "clock_in_time": log.clock_in_time.strftime("%Y-%m-%d %I:%M:%S %p"),
                "clock_out_time": log.clock_out_time.strftime("%Y-%m-%d %I:%M:%S %p") if log.clock_out_time else None,
                "date": log.clock_in_time.strftime("%Y-%m-%d"),
                "time": log.clock_in_time.strftime("%I:%M %p"),
                "status": log.status,
                "location": log.location
            } for log, employee in logs
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "An error occurred fetching attendance data"}), 500

@app.route('/api/leave-requests', methods=['GET'])
def get_leave_requests():
    try:
        requests = db.session.query(LeaveRequest, Employee).join(Employee).all()
        result = [
            {
                "id": req.id,
                "employee_id": req.employee_id,
                "employee_name": employee.name,
                "start_date": req.start_date.strftime("%Y-%m-%d"),
                "end_date": req.end_date.strftime("%Y-%m-%d"),
                "status": req.status,
                "created_at": req.created_at.strftime("%Y-%m-%d")
            } for req, employee in requests
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "An error occurred fetching leave requests"}), 500

@app.route('/api/staff', methods=['GET'])
def get_staff():
    try:
        staff = Employee.query.all()
        result = [
            {
                "employee_id": emp.employee_id,
                "name": emp.name,
                "date_added": emp.date_added.strftime("%Y-%m-%d")
            } for emp in staff
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "An error occurred fetching staff data"}), 500

@app.route('/api/staff/<employee_id>', methods=['GET'])
def get_staff_by_id(employee_id):
    try:
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if employee:
            return jsonify({
                "employee_id": employee.employee_id,
                "name": employee.name,
                "date_added": employee.date_added.strftime("%Y-%m-%d")
            }), 200
        else:
            pass  # Staff ID not found
            return jsonify({"error": "Staff ID not found"}), 404
    except Exception as e:
        pass  # Error fetching staff
        return jsonify({"error": "An error occurred fetching staff data"}), 500

@app.route('/api/staff/delete-all', methods=['DELETE'])
def delete_all_staff():
    """Delete all staff members and their related data"""
    try:
        # Get count before deletion for confirmation
        staff_count = Employee.query.count()
        
        if staff_count == 0:
            return jsonify({"message": "No staff members to delete"}), 200
        
        # Delete related data first (to handle foreign key constraints)
        AttendanceLog.query.delete()
        LeaveRequest.query.delete()
        
        # Delete all employees
        Employee.query.delete()
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully deleted all {staff_count} staff members and their related data",
            "deleted_count": staff_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred deleting staff: {str(e)}"}), 500

@app.route('/api/staff/delete-selected', methods=['DELETE'])
def delete_selected_staff():
    """Delete selected staff members by their employee IDs"""
    try:
        data = request.get_json()
        employee_ids = data.get('employee_ids', [])
        
        if not employee_ids:
            return jsonify({"error": "No employee IDs provided"}), 400
        
        # Validate that all employee IDs exist
        existing_employees = Employee.query.filter(Employee.employee_id.in_(employee_ids)).all()
        existing_ids = [emp.employee_id for emp in existing_employees]
        
        if len(existing_ids) != len(employee_ids):
            missing_ids = set(employee_ids) - set(existing_ids)
            return jsonify({
                "error": f"Some employee IDs not found: {list(missing_ids)}"
            }), 404
        
        # Delete related data for selected employees
        AttendanceLog.query.filter(AttendanceLog.employee_id.in_(employee_ids)).delete()
        LeaveRequest.query.filter(LeaveRequest.employee_id.in_(employee_ids)).delete()
        
        # Delete selected employees
        deleted_count = Employee.query.filter(Employee.employee_id.in_(employee_ids)).delete()
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully deleted {deleted_count} staff members and their related data",
            "deleted_count": deleted_count,
            "deleted_ids": employee_ids
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred deleting selected staff: {str(e)}"}), 500

@app.route('/api/staff/<employee_id>', methods=['PUT'])
def update_individual_staff(employee_id):
    """Update a single staff member"""
    try:
        data = request.get_json()
        hr_email = data.get('hr_email', 'system')
        
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return jsonify({"error": f"Employee with ID {employee_id} not found"}), 404
        
        # Track changes for analytics
        changes = []
        
        # Update fields if provided
        if 'name' in data and data['name'].strip() != employee.name:
            old_name = employee.name
            employee.name = data['name'].strip()
            changes.append(f"name: {old_name} -> {employee.name}")
        
        if 'department' in data and data['department'].strip() != (employee.department or ''):
            old_dept = employee.department or 'None'
            employee.department = data['department'].strip()
            changes.append(f"department: {old_dept} -> {employee.department}")
        
        if 'email' in data and data['email'].strip() != (employee.email or ''):
            old_email = employee.email or 'None'
            employee.email = data['email'].strip()
            changes.append(f"email: {old_email} -> {employee.email}")
        
        if 'contact' in data and data['contact'].strip() != (employee.contact or ''):
            old_contact = employee.contact or 'None'
            employee.contact = data['contact'].strip()
            changes.append(f"contact: {old_contact} -> {employee.contact}")
        
        if 'is_active' in data and data['is_active'] != employee.is_active:
            old_status = 'Active' if employee.is_active else 'Inactive'
            employee.is_active = data['is_active']
            new_status = 'Active' if employee.is_active else 'Inactive'
            changes.append(f"status: {old_status} -> {new_status}")
        
        if changes:
            employee.date_modified = datetime.utcnow()
            
            # Log analytics
            analytics_log = StaffAnalytics(
                employee_id=employee_id,
                action_type='modified',
                performed_by=hr_email,
                details=f"Updated: {', '.join(changes)}"
            )
            db.session.add(analytics_log)
            db.session.commit()
            
            return jsonify({
                "message": f"Successfully updated staff member {employee.name}",
                "employee_id": employee_id,
                "changes": changes
            }), 200
        else:
            return jsonify({
                "message": "No changes detected",
                "employee_id": employee_id
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred updating staff member: {str(e)}"}), 500

@app.route('/api/staff/<employee_id>', methods=['DELETE'])
def delete_individual_staff(employee_id):
    """Delete a single staff member by employee ID"""
    try:
        data = request.get_json() or {}
        hr_email = data.get('hr_email', 'system')
        soft_delete = data.get('soft_delete', True)  # Default to soft delete
        
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return jsonify({"error": f"Employee with ID {employee_id} not found"}), 404
        
        employee_name = employee.name
        
        if soft_delete:
            # Soft delete - mark as inactive (for transfers)
            employee.is_active = False
            employee.date_modified = datetime.utcnow()
            
            # Log analytics
            analytics_log = StaffAnalytics(
                employee_id=employee_id,
                action_type='transferred',
                performed_by=hr_email,
                details=f"Staff transferred/deactivated: {employee_name}"
            )
            db.session.add(analytics_log)
            db.session.commit()
            
            return jsonify({
                "message": f"Successfully transferred/deactivated staff member {employee_name} ({employee_id})",
                "action": "transferred",
                "employee_id": employee_id
            }), 200
        else:
            # Hard delete - completely remove from system
            AttendanceLog.query.filter_by(employee_id=employee_id).delete()
            LeaveRequest.query.filter_by(employee_id=employee_id).delete()
            EmailNotification.query.filter_by(employee_id=employee_id).delete()
            
            # Log analytics before deletion
            analytics_log = StaffAnalytics(
                employee_id=employee_id,
                action_type='deleted',
                performed_by=hr_email,
                details=f"Staff permanently deleted: {employee_name}"
            )
            db.session.add(analytics_log)
            
            db.session.delete(employee)
            db.session.commit()
            
            return jsonify({
                "message": f"Successfully deleted staff member {employee_name} ({employee_id})",
                "action": "deleted",
                "employee_id": employee_id
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred deleting staff member: {str(e)}"}), 500

# Settings API Endpoints
@app.route('/api/settings/<category>', methods=['GET'])
def get_settings(category):
    """Get settings for a specific category"""
    try:
        valid_categories = ['attendance', 'location', 'organization', 'security', 'preferences', 'notifications']
        if category not in valid_categories:
            return jsonify({"error": "Invalid settings category"}), 400

        settings = SystemSettings.query.filter_by(category=category).all()
        result = {}

        for setting in settings:
            # Try to parse JSON values, fallback to string
            try:
                result[setting.setting_key] = eval(setting.setting_value)
            except:
                result[setting.setting_key] = setting.setting_value

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred fetching settings: {str(e)}"}), 500

@app.route('/api/settings/<category>', methods=['POST'])
def update_settings(category):
    """Update settings for a specific category"""
    try:
        valid_categories = ['attendance', 'location', 'organization', 'security', 'preferences', 'notifications']
        if category not in valid_categories:
            return jsonify({"error": "Invalid settings category"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No settings data provided"}), 400

        updated_count = 0
        for key, value in data.items():
            # Convert value to string for storage
            if isinstance(value, (dict, list)):
                value_str = str(value)
            else:
                value_str = str(value)

            # Check if setting exists
            existing_setting = SystemSettings.query.filter_by(
                category=category,
                setting_key=key
            ).first()

            if existing_setting:
                existing_setting.setting_value = value_str
                existing_setting.updated_at = datetime.utcnow()
            else:
                new_setting = SystemSettings(
                    category=category,
                    setting_key=key,
                    setting_value=value_str
                )
                db.session.add(new_setting)

            updated_count += 1

        db.session.commit()
        return jsonify({
            "message": f"Successfully updated {updated_count} settings in {category} category",
            "updated_count": updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred updating settings: {str(e)}"}), 500

@app.route('/api/settings', methods=['GET'])
def get_all_settings():
    """Get all settings organized by category"""
    try:
        settings = SystemSettings.query.all()
        result = {}

        for setting in settings:
            if setting.category not in result:
                result[setting.category] = {}

            # Try to parse JSON values, fallback to string
            try:
                result[setting.category][setting.setting_key] = eval(setting.setting_value)
            except:
                result[setting.category][setting.setting_key] = setting.setting_value

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred fetching settings: {str(e)}"}), 500

@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Get real-time dashboard statistics for HR"""
    try:
        from datetime import date
        
        today = date.today()
        
        # Total employees
        total_employees = Employee.query.count()
        
        # Present today (employees who clocked in today)
        present_today = db.session.query(AttendanceLog.employee_id).filter(
            AttendanceLog.date_only == today,
            AttendanceLog.status.in_(['present', 'late'])
        ).distinct().count()
        
        # On leave today (approved leave requests that cover today)
        on_leave_today = LeaveRequest.query.filter(
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == 'approved'
        ).count()
        
        # Late arrivals today
        late_arrivals = AttendanceLog.query.filter(
            AttendanceLog.date_only == today,
            AttendanceLog.status == 'late'
        ).count()
        
        # Absent today (employees who should be working but didn't clock in)
        # This is more complex - we'd need to know working days, but for now let's calculate
        # employees who exist but didn't clock in today
        total_expected = total_employees - on_leave_today
        absent_today = max(0, total_expected - present_today)
        
        result = {
            "total_employees": total_employees,
            "present_today": present_today,
            "on_leave_today": on_leave_today,
            "late_arrivals": late_arrivals,
            "absent_today": absent_today,
            "expected_today": total_expected
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": f"An error occurred fetching dashboard stats: {str(e)}"}), 500

@app.route('/api/backup', methods=['POST'])
def create_backup():
    """Create a system backup"""
    try:
        # This is a simplified backup - in production you'd create a proper backup file
        backup_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "employees": [{"id": e.employee_id, "name": e.name, "date_added": e.date_added.isoformat()} for e in Employee.query.all()],
            "attendance_logs": [{
                "employee_id": log.employee_id,
                "clock_in_time": log.clock_in_time.isoformat(),
                "clock_out_time": log.clock_out_time.isoformat() if log.clock_out_time else None,
                "status": log.status,
                "location": log.location
            } for log in AttendanceLog.query.all()],
            "leave_requests": [{
                "employee_id": req.employee_id,
                "start_date": req.start_date.isoformat(),
                "end_date": req.end_date.isoformat(),
                "status": req.status
            } for req in LeaveRequest.query.all()],
            "settings": [{
                "category": s.category,
                "key": s.setting_key,
                "value": s.setting_value
            } for s in SystemSettings.query.all()]
        }

        # Update last backup time
        backup_setting = SystemSettings.query.filter_by(
            category='system',
            setting_key='last_backup'
        ).first()

        if backup_setting:
            backup_setting.setting_value = datetime.utcnow().isoformat()
        else:
            new_setting = SystemSettings(
                category='system',
                setting_key='last_backup',
                setting_value=datetime.utcnow().isoformat()
            )
            db.session.add(new_setting)

        db.session.commit()

        return jsonify({
            "message": "Backup created successfully",
            "backup_data": backup_data,
            "timestamp": backup_data["timestamp"]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred creating backup: {str(e)}"}), 500

@app.route('/api/reset-system', methods=['POST'])
def reset_system():
    """Reset the entire system (dangerous operation)"""
    try:
        # This is extremely dangerous - in production you'd have much more security
        confirm_text = request.get_json().get('confirmation')
        if confirm_text != 'SYSTEM RESET':
            return jsonify({"error": "Invalid confirmation text"}), 400

        # Clear all data
        AttendanceLog.query.delete()
        LeaveRequest.query.delete()
        SystemSettings.query.delete()
        Employee.query.delete()

        db.session.commit()

        db.session.commit()

        return jsonify({
            "message": "System reset complete. All data has been cleared. Ready for production use.",
            "status": "success"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred resetting system: {str(e)}"}), 500

# Staff Dashboard API endpoints
@app.route('/api/attendance/today/<employee_id>', methods=['GET'])
def get_today_attendance(employee_id):
    """Get today's attendance status for a staff member"""
    try:
        today = datetime.now().date()
        attendance = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date=today
        ).first()
        
        if attendance:
            return jsonify({
                "employee_id": employee_id,
                "date": attendance.date.strftime("%Y-%m-%d"),
                "clock_in_time": attendance.clock_in_time.strftime("%H:%M:%S") if attendance.clock_in_time else None,
                "clock_out_time": attendance.clock_out_time.strftime("%H:%M:%S") if attendance.clock_out_time else None,
                "status": "present" if attendance.clock_in_time else "absent"
            }), 200
        else:
            return jsonify({
                "employee_id": employee_id,
                "date": today.strftime("%Y-%m-%d"),
                "clock_in_time": None,
                "clock_out_time": None,
                "status": "absent"
            }), 200
    except Exception as e:
        return jsonify({"error": "An error occurred fetching attendance data"}), 500

@app.route('/api/attendance/monthly-summary/<employee_id>', methods=['GET'])
def get_monthly_summary(employee_id):
    """Get monthly attendance summary for a staff member"""
    try:
        today = datetime.now()
        start_of_month = today.replace(day=1)
        
        # Get all attendance records for this month
        attendance_records = AttendanceLog.query.filter(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.date >= start_of_month
        ).all()
        
        total_days = len(attendance_records)
        present_days = len([r for r in attendance_records if r.clock_in_time])
        
        return jsonify({
            "employee_id": employee_id,
            "month": today.strftime("%B %Y"),
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": total_days - present_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 1)
        }), 200
    except Exception as e:
        return jsonify({"error": "An error occurred fetching monthly summary"}), 500

@app.route('/api/attendance/report/<employee_id>', methods=['GET'])
def get_staff_attendance_report(employee_id):
    """Get detailed attendance report for a staff member"""
    try:
        # Get employee info
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        
        # Get attendance records (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        attendance_records = AttendanceLog.query.filter(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.date >= thirty_days_ago.date()
        ).order_by(AttendanceLog.date.desc()).all()
        
        records = []
        for record in attendance_records:
            records.append({
                "date": record.date.strftime("%Y-%m-%d"),
                "clock_in_time": record.clock_in_time.strftime("%H:%M:%S") if record.clock_in_time else None,
                "clock_out_time": record.clock_out_time.strftime("%H:%M:%S") if record.clock_out_time else None,
                "status": "present" if record.clock_in_time else "absent"
            })
        
        return jsonify({
            "employee_id": employee_id,
            "employee_name": employee.name,
            "department": employee.department,
            "email": employee.email,
            "report_period": f"Last 30 days",
            "records": records,
            "total_records": len(records),
            "present_days": len([r for r in records if r["status"] == "present"])
        }), 200
    except Exception as e:
        return jsonify({"error": "An error occurred generating report"}), 500

# New Departmental Reports Endpoints
@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get list of all departments"""
    try:
        departments = db.session.query(Employee.department).distinct().filter(
            Employee.department.isnot(None),
            Employee.is_active == True
        ).all()
        
        dept_list = [dept[0] for dept in departments if dept[0]]
        dept_list.sort()
        
        return jsonify({
            "departments": dept_list,
            "total_departments": len(dept_list)
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching departments: {str(e)}"}), 500

@app.route('/api/departments/<department>/staff', methods=['GET'])
def get_department_staff(department):
    """Get all staff in a specific department"""
    try:
        staff = Employee.query.filter_by(
            department=department,
            is_active=True
        ).all()
        
        result = []
        for emp in staff:
            result.append({
                "employee_id": emp.employee_id,
                "name": emp.name,
                "email": emp.email,
                "contact": emp.contact,
                "date_added": emp.date_added.strftime("%Y-%m-%d")
            })
        
        return jsonify({
            "department": department,
            "staff": result,
            "total_staff": len(result)
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching department staff: {str(e)}"}), 500

@app.route('/api/departments/<department>/attendance-report', methods=['GET'])
def get_department_attendance_report(department):
    """Get attendance report for a specific department"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = db.session.query(AttendanceLog, Employee).join(Employee).filter(
            Employee.department == department,
            Employee.is_active == True
        )
        
        if start_date:
            query = query.filter(AttendanceLog.date_only >= datetime.strptime(start_date, "%Y-%m-%d").date())
        if end_date:
            query = query.filter(AttendanceLog.date_only <= datetime.strptime(end_date, "%Y-%m-%d").date())
        
        logs = query.all()
        
        result = []
        for log, employee in logs:
            result.append({
                "employee_id": log.employee_id,
                "employee_name": employee.name,
                "department": employee.department,
                "clock_in_time": log.clock_in_time.strftime("%Y-%m-%d %H:%M:%S"),
                "clock_out_time": log.clock_out_time.strftime("%Y-%m-%d %H:%M:%S") if log.clock_out_time else None,
                "date": log.date_only.strftime("%Y-%m-%d"),
                "status": log.status,
                "location": log.location
            })
        
        return jsonify({
            "department": department,
            "attendance_records": result,
            "total_records": len(result)
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error generating department report: {str(e)}"}), 500

# Staff Analytics Endpoints
@app.route('/api/analytics/staff-changes', methods=['GET'])
def get_staff_analytics():
    """Get analytics on staff changes (additions, transfers, deletions)"""
    try:
        days = int(request.args.get('days', 30))
        since_date = datetime.now() - timedelta(days=days)
        
        analytics = StaffAnalytics.query.filter(
            StaffAnalytics.action_date >= since_date
        ).order_by(StaffAnalytics.action_date.desc()).all()
        
        result = []
        for record in analytics:
            result.append({
                "employee_id": record.employee_id,
                "action_type": record.action_type,
                "action_date": record.action_date.strftime("%Y-%m-%d %H:%M:%S"),
                "performed_by": record.performed_by,
                "details": record.details
            })
        
        # Summary statistics
        summary = {
            "added": len([r for r in analytics if r.action_type == 'added']),
            "modified": len([r for r in analytics if r.action_type == 'modified']),
            "transferred": len([r for r in analytics if r.action_type == 'transferred']),
            "deleted": len([r for r in analytics if r.action_type == 'deleted'])
        }
        
        return jsonify({
            "analytics": result,
            "summary": summary,
            "period_days": days,
            "total_changes": len(result)
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching analytics: {str(e)}"}), 500

# Email Notification Endpoints
@app.route('/api/notifications/send-reminders', methods=['POST'])
def send_clock_in_reminders():
    """Send clock-in reminders to staff who haven't clocked in"""
    try:
        data = request.get_json()
        cutoff_time = data.get('cutoff_time', '09:30')  # Default 9:30 AM
        hr_email = data.get('hr_email', 'system')
        
        today = datetime.now().date()
        cutoff_datetime = datetime.combine(today, datetime.strptime(cutoff_time, '%H:%M').time())
        
        if datetime.now() < cutoff_datetime:
            return jsonify({"message": "It's too early to send reminders"}), 400
        
        # Get staff who haven't clocked in today and have emails
        clocked_in_today_subquery = db.session.query(AttendanceLog.employee_id).filter(
            AttendanceLog.date_only == today
        ).distinct().subquery()
        
        staff_to_remind = Employee.query.filter(
            Employee.is_active == True,
            Employee.email.isnot(None),
            Employee.email != '',
            ~Employee.employee_id.in_(db.session.query(clocked_in_today_subquery.c.employee_id))
        ).all()
        
        reminders_sent = 0
        for staff in staff_to_remind:
            # Check if reminder already sent today
            existing_notification = EmailNotification.query.filter_by(
                employee_id=staff.employee_id,
                notification_type='clock_in_reminder'
            ).filter(
                EmailNotification.created_at >= today
            ).first()
            
            if not existing_notification:
                # Create notification record
                notification = EmailNotification(
                    employee_id=staff.employee_id,
                    notification_type='clock_in_reminder',
                    email_sent=True,  # In production, integrate with actual email service
                    sent_at=datetime.utcnow(),
                    message_content=f"Reminder: Please clock in for {today.strftime('%B %d, %Y')}"
                )
                db.session.add(notification)
                reminders_sent += 1
        
        db.session.commit()
        
        return jsonify({
            "message": f"Clock-in reminders processed for {reminders_sent} staff members",
            "reminders_sent": reminders_sent,
            "total_staff_to_remind": len(staff_to_remind)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error sending reminders: {str(e)}"}), 500

@app.route('/api/notifications/history', methods=['GET'])
def get_notification_history():
    """Get email notification history"""
    try:
        days = int(request.args.get('days', 7))
        since_date = datetime.now() - timedelta(days=days)
        
        notifications = db.session.query(EmailNotification, Employee).join(Employee).filter(
            EmailNotification.created_at >= since_date
        ).order_by(EmailNotification.created_at.desc()).all()
        
        result = []
        for notification, employee in notifications:
            result.append({
                "employee_id": notification.employee_id,
                "employee_name": employee.name,
                "employee_email": employee.email,
                "notification_type": notification.notification_type,
                "email_sent": notification.email_sent,
                "sent_at": notification.sent_at.strftime("%Y-%m-%d %H:%M:%S") if notification.sent_at else None,
                "created_at": notification.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "message_content": notification.message_content
            })
        
        return jsonify({
            "notifications": result,
            "total_notifications": len(result),
            "period_days": days
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching notification history: {str(e)}"}), 500

# Health check endpoint for Render deployment
@app.route('/health')
def health_check():
    """Health check endpoint for deployment platforms"""
    try:
        # Test database connectivity
        with app.app_context():
            db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'healthy', 
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Root endpoint
@app.route('/')
def root():
    """Root endpoint - redirect to main application"""
    return jsonify({
        'message': 'NJSMA Clock-In System API',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'frontend': '/clock-in-system/',
            'api': '/api/'
        }
    }), 200

# Initialize database and settings for production
def initialize_app():
    print("NJSMA Clock-In System Backend Server")
    with app.app_context():
        db.create_all()
        print("Database tables created successfully")
        
        # Initialize default system settings if they don't exist
        initialize_default_settings()

# Initialize when module is imported (for Gunicorn)
initialize_app()

if __name__ == '__main__':
    # This should only run for local development
    port = int(os.environ.get('PORT', 5000))
    print("Running in development mode - use Gunicorn for production")
    app.run(debug=False, host='0.0.0.0', port=port)

# Initialize database tables for production
with app.app_context():
    db.create_all()
    
    # Handle database migration - add new columns if they don't exist
    migration_needed = False
    try:
        # Test if new columns exist by trying to query them
        Employee.query.with_entities(Employee.department, Employee.email, Employee.contact, Employee.date_modified, Employee.is_active).first()
        print("✓ All required columns exist")
    except Exception as e:
        print(f"Database migration needed: {str(e)}")
        migration_needed = True
        
        # Define migrations
        migrations = [
            {
                'name': 'department',
                'sql': "ALTER TABLE employee ADD COLUMN department VARCHAR(100) DEFAULT 'General'"
            },
            {
                'name': 'email', 
                'sql': "ALTER TABLE employee ADD COLUMN email VARCHAR(120)"
            },
            {
                'name': 'contact',
                'sql': "ALTER TABLE employee ADD COLUMN contact VARCHAR(20)"
            },
            {
                'name': 'date_modified',
                'sql': "ALTER TABLE employee ADD COLUMN date_modified TIMESTAMP"
            },
            {
                'name': 'is_active',
                'sql': "ALTER TABLE employee ADD COLUMN is_active BOOLEAN DEFAULT TRUE"
            }
        ]
        
        # Execute migrations
        successful_migrations = 0
        try:
            with db.engine.connect() as conn:
                for migration in migrations:
                    try:
                        conn.execute(db.text(migration['sql']))
                        conn.commit()
                        print(f"✓ Added {migration['name']} column")
                        successful_migrations += 1
                        
                        # Set default values for new columns if needed
                        if migration['name'] == 'date_modified':
                            conn.execute(db.text("UPDATE employee SET date_modified = date_added WHERE date_modified IS NULL"))
                            conn.commit()
                        elif migration['name'] == 'department':
                            conn.execute(db.text("UPDATE employee SET department = 'General' WHERE department IS NULL"))
                            conn.commit()
                        elif migration['name'] == 'is_active':
                            conn.execute(db.text("UPDATE employee SET is_active = 1 WHERE is_active IS NULL"))
                            conn.commit()
                            
                    except Exception as col_error:
                        error_str = str(col_error).lower()
                        if 'already exists' in error_str or 'duplicate column' in error_str:
                            print(f"- Column {migration['name']} already exists")
                            successful_migrations += 1
                        else:
                            print(f"✗ Error adding {migration['name']} column: {col_error}")
                            
                print(f"Migration completed: {successful_migrations}/{len(migrations)} columns processed")
        except Exception as migration_error:
            print(f"Critical migration error: {str(migration_error)}")
            print("Application may not function correctly without proper database schema")
    
    # Verify migration success if it was needed
    if migration_needed:
        try:
            Employee.query.with_entities(Employee.department, Employee.email, Employee.contact, Employee.date_modified, Employee.is_active).first()
            print("✓ Database migration verification successful")
        except Exception as verify_error:
            print(f"✗ Migration verification failed: {verify_error}")
            print("Some features may not work correctly")
    
    # Production database initialization complete
    print("Production database initialized successfully")