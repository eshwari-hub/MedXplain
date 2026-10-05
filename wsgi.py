"""
WSGI Entry Point for Production Deployment of MEDIC-XAI Flask Backend
Compatible with Gunicorn, uWSGI, Render, Railway, Heroku, AWS Elastic Beanstalk, and Docker.
"""

import os
import sys

# Configure single-thread CPU execution before TensorFlow import to prevent thread contention & memory spikes
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"
os.environ["TF_NUM_INTEROP_THREADS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Ensure current and parent directories are in python search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from backend_sample.app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port)
