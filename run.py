import os
import sys

# Get absolute path to the virtual environment's python interpreter
current_dir = os.path.dirname(os.path.abspath(__file__))
venv_python = os.path.join(current_dir, ".venv", "bin", "python")

# If the virtual environment python exists and we are not currently using it,
# restart the process using the venv python.
if os.path.exists(venv_python) and sys.executable != venv_python:
    print(f"Switching execution to Python virtual environment: {venv_python}")
    os.execv(venv_python, [venv_python] + sys.argv)

# Import the Flask app and run it
try:
    from app import app
    print("\n=======================================================")
    print("  BigQuery Release Notes Tracker is starting!")
    print("  Open your browser and navigate to: http://127.0.0.1:5000")
    print("=======================================================\n")
    app.run(host='127.0.0.1', port=5000, debug=False)
except ImportError as e:
    print(f"Error: Could not import dependencies. {str(e)}")
    print("Please make sure dependencies are installed by running: .venv/bin/pip install -r requirements.txt")
    sys.exit(1)
