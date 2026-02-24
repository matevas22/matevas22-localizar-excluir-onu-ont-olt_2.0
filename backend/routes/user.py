from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from ..database import db
from ..models import Log, User

user_bp = Blueprint('user', __name__)

@user_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify([]), 200

    user_logs = Log.query.filter_by(username=user.username).all()

    stats = {}
    for log in user_logs:
        raw_action = log.action.lower()
        
        if "verificou detalhes" in raw_action:
            category = "Verificou Detalhes"
        elif "verificou onu" in raw_action or "sinal" in raw_action:
            category = "Verificou Sinal"
        elif "localizou" in raw_action:
            category = "Localizou ONU"
        elif "login" in raw_action or "logged" in raw_action:
            category = "Login"
        elif "excluiu" in raw_action:
            category = "Excluiu ONU"
        elif "alterou" in raw_action or "changed" in raw_action:
            category = "Alterou Dados"
        else:
            words = log.action.split()
            category = " ".join(words[:2]) if len(words) >= 2 else log.action
            
        stats[category] = stats.get(category, 0) + 1
    
    result = [{"action": k, "count": v} for k, v in stats.items()]
    result.sort(key=lambda x: x['count'], reverse=True)
    
    return jsonify(result), 200

@user_bp.route('/recent', methods=['GET'])
@jwt_required()
def get_recent_activity():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify([]), 200
        
    recent_logs = Log.query.filter_by(username=user.username)\
        .order_by(Log.timestamp.desc())\
        .limit(5)\
        .all()
        
    return jsonify([{
        "id": log.id,
        "action": log.action,
        "details": getattr(log, 'details', None),
        "timestamp": log.timestamp.isoformat(),
        "system": getattr(log, 'system', None)
    } for log in recent_logs]), 200

@user_bp.route('/recent-sns', methods=['GET'])
@jwt_required()
def get_recent_sns():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify([]), 200

    logs = Log.query.filter(
        Log.username == user.username,
        or_(
            Log.action.like('Localizou ONU:%'),
            Log.action.like('Verificou sinal de:%')
        )
    ).order_by(Log.timestamp.desc()).limit(50).all()

    sns = []
    seen = set()
    for log in logs:
        parts = log.action.split(': ')
        if len(parts) > 1:
            sn = parts[1].strip()
            if sn not in seen and len(sn) == 12:
                sns.append(sn)
                seen.add(sn)
        if len(sns) >= 4:
            break
            
    return jsonify(sns), 200

