# NJSMA Clock-In System

A modern, responsive clock-in system built with Flask and designed for production deployment on Vercel.

## Features

### Core Functionality
- **Employee Clock In/Out**: Secure time tracking with location validation
- **HR Dashboard**: Comprehensive attendance reporting and analytics
- **Leave Management**: Employee leave requests with HR approval workflow
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with Font Awesome icons

### Enhanced HR Management System
- **5-Column Staff Data Format**: Name, Staff ID, Department, Email, Contact
- **Departmental Management**: Filter and manage staff by departments
- **Email Notifications**: Send automated clock-in reminders to staff
- **Individual Staff Management**: Add, edit, transfer, or remove staff members
- **Bulk Operations**: Upload Excel/CSV files with enhanced staff data
- **Staff Analytics**: Track staff changes, additions, and transfers
- **Departmental Reporting**: Generate attendance reports by department
- **Transfer Management**: Handle staff transfers with proper tracking

## Tech Stack

- **Backend**: Flask, SQLAlchemy, Python (Serverless)
- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Deployment**: Vercel (serverless functions)
- **Styling**: Custom CSS with responsive grid layout

## Recent Updates

### Enhanced HR Management System (Latest)
- **Database Migration**: Automatic migration system for adding new columns
- **5-Column Staff Format**: Enhanced employee data with department, email, contact
- **Email Integration**: Framework for sending notifications and reminders
- **Analytics Dashboard**: Comprehensive staff change tracking and reporting
- **Departmental Features**: Full departmental management and reporting

### Migration Notes
The system now automatically handles database migrations when deploying updates. If you encounter column-related errors, check the `DEPLOYMENT_UPDATE.md` for troubleshooting steps.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
   ```
4. The system will automatically create/migrate the database on first run
4. Open `http://127.0.0.1:5000` in your browser

## Deployment to Vercel

The application is now configured for Vercel serverless deployment:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Python serverless function
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`: PostgreSQL connection string (for production)
   - `FLASK_ENV`: Set to `production`
4. Deploy

## Database Setup for Production

For production deployment, you'll need to set up a PostgreSQL database. Add the database URL as an environment variable in Vercel:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## API Endpoints

All API endpoints are handled by the serverless function at `/api/index.py`:

- `POST /api/clock-in` - Clock in employee
- `POST /api/clock-out` - Clock out employee
- `GET /api/status/:id` - Get employee status
- `POST /api/staff` - Add staff members
- `GET /api/staff` - Get all staff
- `POST /api/leave-request` - Submit leave request
- `GET /api/leave-requests` - Get all leave requests
- `GET /api/dashboard-stats` - Get dashboard statistics

## Project Structure

```
├── api/
│   └── index.py          # Vercel serverless function
├── requirements.txt      # Python dependencies
├── vercel.json          # Vercel deployment configuration
├── README.md            # This file
├── clock-in-system/     # Frontend files
│   ├── index.html       # Main page
│   ├── css/
│   │   └── styles.css   # Application styles
│   ├── js/
│   │   └── scripts.js   # JavaScript functionality
│   ├── employee/        # Employee pages
│   └── hr/              # HR management pages
├── instance/
│   └── clock_in_system.db # SQLite database (dev)
└── app.py               # Local development server
```

## Serverless Architecture

The application has been restructured for Vercel's serverless environment:

- All Flask routes converted to serverless function handlers
- Static file serving handled by the serverless function
- Database connections established per function invocation
- Proper error handling and JSON responses for API endpoints

## License

This project is licensed under the MIT License.