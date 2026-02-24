from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from ..database import db
from ..models import User, Log

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user:
        stored_password = user.password
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')
        
        if bcrypt.checkpw(password.encode('utf-8'), stored_password):
            access_token = create_access_token(identity=str(user.id))
            
            log = Log(username=username, action="User logged in")
            db.session.add(log)
            db.session.commit()

            return jsonify(access_token=access_token, user=user.to_dict()), 200

    return jsonify({"msg": "Bad username or password"}), 401

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity()
    data = request.json
    new_password = data.get('new_password')

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed.decode('utf-8')
    
    log = Log(username=user.username, action="Changed password")
    db.session.add(log)
    db.session.commit()

    return jsonify({"msg": "Password updated successfully"}), 200

@auth_bp.route('/check', methods=['GET'])
@jwt_required()
def check_auth():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({"msg": "User not found"}), 404
