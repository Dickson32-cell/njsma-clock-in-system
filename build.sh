#!/bin/bash
# Render build script - Forces pip over Poetry
echo "==> NJSMA Clock-In System Build Script"
echo "==> Forcing pip installation (no Poetry)"

# Disable Poetry completely
export POETRY_ACTIVE=0
export DISABLE_POETRY=1

# Use pip directly
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "==> Build completed with pip (Poetry bypassed)"