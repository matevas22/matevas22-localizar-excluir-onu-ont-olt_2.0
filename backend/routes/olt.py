from flask import Blueprint, jsonify, request
from ..models import db, OLT, StatusDescription, SystemConfig
import re

olt_bp = Blueprint('olts', __name__)

@olt_bp.route('/config', methods=['GET'])
def get_config():
    configs = SystemConfig.query.all()
    if not configs:
        return jsonify({
            'universal_username': '',
            'universal_password': ''
        })
    
    config_dict = {c.key: c.value for c in configs}
    return jsonify(config_dict)

@olt_bp.route('/config', methods=['POST'])
def update_config():
    data = request.json
    username = data.get('universal_username')
    password = data.get('universal_password')

    if username is not None:
        u_config = SystemConfig.query.filter_by(key='universal_username').first()
        if not u_config:
            u_config = SystemConfig(key='universal_username')
            db.session.add(u_config)
        u_config.value = username

    if password is not None:
        p_config = SystemConfig.query.filter_by(key='universal_password').first()
        if not p_config:
            p_config = SystemConfig(key='universal_password')
            db.session.add(p_config)
        p_config.value = password
    
    db.session.commit()
    return jsonify({'message': 'Config updated'}), 200

@olt_bp.route('/', methods=['GET'])
def list_olts():
    olts = OLT.query.all()
    return jsonify([o.to_dict() for o in olts])

@olt_bp.route('/status', methods=['GET'])
def list_statuses():
    statuses = StatusDescription.query.all()
    return jsonify([s.to_dict() for s in statuses])

@olt_bp.route('/status', methods=['POST'])
def add_status():
    data = request.json
    code = data.get('status_code')
    desc = data.get('description')
    color = data.get('color', 'gray')
    
    if not code or not desc:
        return jsonify({"error": "Missing code or description"}), 400
        
    existing = StatusDescription.query.filter_by(status_code=code).first()
    if existing:
        return jsonify({"error": "Status code already exists"}), 400

    new_status = StatusDescription(status_code=code, description=desc, color=color)
    db.session.add(new_status)
    db.session.commit()
    return jsonify(new_status.to_dict()), 201

@olt_bp.route('/status/<int:id>', methods=['PUT'])
def update_status(id):
    status = StatusDescription.query.get(id)
    if not status:
        return jsonify({"error": "Status not found"}), 404
        
    data = request.json
    if 'status_code' in data: status.status_code = data['status_code']
    if 'description' in data: status.description = data['description']
    if 'color' in data: status.color = data['color']
    
    db.session.commit()
    return jsonify(status.to_dict())

@olt_bp.route('/status/<int:id>', methods=['DELETE'])
def delete_status(id):
    status = StatusDescription.query.get(id)
    if not status:
        return jsonify({"error": "Status not found"}), 404
    db.session.delete(status)
    db.session.commit()
    return jsonify({"message": "Deleted"})
    for olt in olts:
        d = olt.to_dict()
        d['password'] = "********" if olt.password else None
        result.append(d)
    return jsonify(result)

@olt_bp.route('/', methods=['POST'])
def add_olt():
    data = request.json
    name = data.get('name')
    ip = data.get('ip')
    username = data.get('username') 
    password = data.get('password')
    type = data.get('type', 'ZTE')
    actions = ",".join(data.get('actions', ['view']))

    if not ip or not name:
        return jsonify({"error": "Missing required fields"}), 400

    new_olt = OLT(
        name=name,
        ip=ip,
        username=username,
        password=password,
        type=type,
        actions=actions
    )
    db.session.add(new_olt)
    db.session.commit()
    return jsonify({"message": "OLT added successfully", "olt": new_olt.to_dict()}), 201

@olt_bp.route('/<int:id>', methods=['PUT'])
def update_olt(id):
    olt = OLT.query.get(id)
    if not olt:
        return jsonify({"error": "OLT not found"}), 404
        
    data = request.json
    if 'name' in data: olt.name = data['name']
    if 'ip' in data: olt.ip = data['ip']
    if 'username' in data: olt.username = data['username'] 
    if 'password' in data: 
        if data['password'] == "":
             olt.password = None
        else:
             olt.password = data['password']
             
    if 'type' in data: olt.type = data['type']
    if 'actions' in data: olt.actions = ",".join(data['actions'])

    db.session.commit()
    return jsonify({"message": "OLT updated"}), 200

@olt_bp.route('/<int:id>', methods=['DELETE'])
def delete_olt(id):
    olt = OLT.query.get(id)
    if not olt:
        return jsonify({"error": "OLT not found"}), 404
    
    db.session.delete(olt)
    db.session.commit()
    return jsonify({"message": "OLT deleted"}), 200
