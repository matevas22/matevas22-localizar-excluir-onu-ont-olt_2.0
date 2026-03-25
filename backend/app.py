from dotenv import load_dotenv
import os
import eventlet
eventlet.monkey_patch()

load_dotenv()

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from database import db
from config import Config
from routes.auth import auth_bp
from routes.onu import onu_bp
from routes.admin import admin_bp
from routes.user import user_bp
from routes.olt import olt_bp

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    jwt = JWTManager(app)
    db.init_app(app)
    from database import migrate
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(onu_bp, url_prefix='/api/onu')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(olt_bp, url_prefix='/api/olts')

    # Inicializar SocketIO com o app
    socketio.init_app(app)

    # Monitoramento de OLTs em background
    from utils.olt_monitor import start_monitor
    print("[INIT] Iniciando servidor e monitor...")
    start_monitor(app, socketio)

    return app

app = create_app()

if __name__ == '__main__':
    socketio.run(app, debug=False, port=5000, host='0.0.0.0', log_output=True)
