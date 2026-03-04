from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..database import db
from ..models import User, Log
import bcrypt

admin_bp = Blueprint('admin', __name__)


def _normalize_user_type(data):
    user_type = (data.get('type_user') or data.get('role') or data.get('nivel') or 'tech')
    user_type = str(user_type).strip().lower()
    return user_type if user_type in ('admin', 'tech') else 'tech'


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user_type = _normalize_user_type(data)

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400
    
    # Case-insensitive username check
    if User.query.filter(func.lower(User.username) == func.lower(username)).first():
        return jsonify({"msg": "User already exists"}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = User(
        username=username,
        password=hashed.decode('utf-8'),
        type_user=user_type
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"msg": "User created successfully"}), 201

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    if user.username == 'admin':
        return jsonify({"msg": "Cannot delete admin user"}), 403

    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "User deleted"}), 200

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    data = request.json
    new_username = data.get('username')
    new_password = data.get('password')
    new_user_type = _normalize_user_type(data)

    if new_username:
        # Check if username exists (unless it's the same user) - case-insensitive
        existing = User.query.filter(func.lower(User.username) == func.lower(new_username)).first()
        if existing and existing.id != user_id:
            return jsonify({"msg": "Username already taken"}), 400
        user.username = new_username

    if new_password:
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        user.password = hashed.decode('utf-8')

    if 'type_user' in data or 'role' in data or 'nivel' in data:
        user.type_user = new_user_type

    db.session.commit()
    return jsonify({"msg": "User updated successfully"}), 200

@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    logs = Log.query.order_by(Log.timestamp.desc()).limit(100).all()
    return jsonify([log.to_dict() for log in logs]), 200
