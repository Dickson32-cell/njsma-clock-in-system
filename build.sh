#!/bin/bash
# NJSMA Clock-In System - FORCE PIP ONLY (NO POETRY)
echo "==> NJSMA Clock-In System Build"
echo "==> BLOCKING Poetry installation completely"

# Kill any Poetry processes and prevent installation
export POETRY_ACTIVE=0
export DISABLE_POETRY=1
export USE_PIP=1
export PIP_NO_POETRY_VERSION_CHECK=1

# Remove any Poetry installation paths
rm -rf ~/.poetry
rm -rf /opt/render/project/poetry
unset POETRY_HOME

# Force pip usage only
echo "==> Using pip only (Poetry blocked)"
python -m pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

echo "==> Dependencies installed with pip successfully"
echo "==> Poetry installation prevented"