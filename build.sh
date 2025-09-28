#!/bin/bash
# Build script to force pip installation and avoid Poetry
echo "==> Forcing pip installation, avoiding Poetry"
python -m pip install --upgrade pip
pip install -r requirements.txt
echo "==> Dependencies installed successfully with pip"