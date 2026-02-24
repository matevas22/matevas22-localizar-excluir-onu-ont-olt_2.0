from dotenv import load_dotenv
import os

load_dotenv()

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .database import db
from .config import Config
from .routes.auth import auth_bp
from .routes.onu import onu_bp
from .routes.admin import admin_bp
from .routes.user import user_bp
from .routes.olt import olt_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    jwt = JWTManager(app)
    db.init_app(app)

    with app.app_context():
        db.create_all()

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(onu_bp, url_prefix='/api/onu')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(olt_bp, url_prefix='/api/olts')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000, host='0.0.0.0')
