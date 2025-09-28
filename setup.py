from setuptools import setup, find_packages

setup(
    name="njsma-clock-in-system",
    version="1.0.0",
    description="NJSMA Clock-In System for Real-time Attendance Management",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "Flask==3.0.3",
        "Flask-SQLAlchemy==3.1.1",
        "Flask-CORS==4.0.0", 
        "Werkzeug==3.0.3",
        "SQLAlchemy==2.0.34",
        "python-dateutil==2.9.0",
        "psycopg[binary]==3.2.3",
        "gunicorn==23.0.0"
    ],
    python_requires='>=3.12',
)