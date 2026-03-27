from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models import db, OLT, StatusDescription, SystemConfig, OLTMonitorData
import os
import json
import re
from utils.telnet import get_credentials
from netmiko import ConnectHandler
from utils.olt_monitor import check_port, parse_onu_state
import time
from netmiko import ConnectHandler
from utils.olt_monitor import check_port
from sqlalchemy.orm.attributes import flag_modified
from utils.drivers import get_olt_driver
from utils.telnet import get_credentials
import traceback

olt_bp = Blueprint('olts', __name__)

@olt_bp.route('/monitor-status', methods=['GET'])
@jwt_required()
def get_monitor_status():
    try:
        latest = OLTMonitorData.query.order_by(OLTMonitorData.id.desc()).first()
        if latest:
            return jsonify({
                "id": latest.id,
                "data": latest.data,
                "updated_at": latest.updated_at.isoformat() if latest.updated_at else None
            }), 200
        else:
            return jsonify({"status": "waiting", "message": "First scan in progress. Please wait 2-3 minutes."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@olt_bp.route('/config', methods=['GET'])
@jwt_required()
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
@jwt_required()
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
@jwt_required()
def list_olts():
    olts = OLT.query.all()
    result = []
    for olt in olts:
        d = olt.to_dict()
        if 'password' in d and d['password']:
            d['password'] = "********"
        result.append(d)
    return jsonify(result)

@olt_bp.route('/status', methods=['GET'])
@jwt_required()
def list_statuses():
    statuses = StatusDescription.query.all()
    return jsonify([s.to_dict() for s in statuses])

@olt_bp.route('/status', methods=['POST'])
@jwt_required()
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



@olt_bp.route('/refresh-port', methods=['POST'])
@jwt_required()
def refresh_port():
    data = request.json
    olt_ip = data.get('olt_ip')
    port = data.get('port')

    if not olt_ip or not port:
        return jsonify({"error": "Missing OLT IP or Port"}), 400

    olt = OLT.query.filter_by(ip=olt_ip).first()
    if not olt:
        return jsonify({"error": "OLT not found"}), 404

    user, pwd = get_credentials(olt_ip)
    
    device_params = {
        'device_type': 'zte_zxros_telnet',
        'host': olt_ip,
        'username': user,
        'password': pwd,
        'global_delay_factor': 0.5,
        'conn_timeout': 30,
        'fast_cli': False,
    }

    try:
        with ConnectHandler(**device_params) as device:
            device.write_channel('\n')
            time.sleep(1)
            try:
                device.enable()
            except:
                pass

            pattern = r'[>#]'
            
            device.send_command('terminal length 0', expect_string=pattern)
            
            port_data = check_port(device, port, pattern)
            
            if not port_data:
                 return jsonify({"error": "Nenhuma ONU encontrada ou OLT não respondeu corretamente."}, 500)

            monitor_entry = OLTMonitorData.query.first()
            if monitor_entry:
                try:
                    current_cache = monitor_entry.data if monitor_entry.data else {}
                    
                    if olt_ip not in current_cache:
                        current_cache[olt_ip] = []
                     
                    ports = current_cache[olt_ip]
                    found = False
                    for i, p in enumerate(ports):
                        if p['port'] == port:
                            ports[i] = port_data
                            found = True
                            break
                    
                    if not found:
                        ports.append(port_data)
                    
             
                 
                    monitor_entry.data = current_cache
                    flag_modified(monitor_entry, "data")
                    db.session.commit()
                    try:
                        from app import socketio
                        socketio.emit('olt_update', {
                            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                            'data': current_cache
                        })
                    except Exception as ws_err:
                        print(f"[WS ERROR] {ws_err}")

                except Exception as db_err:
                    db.session.rollback()
                    print(f"[DB ERROR] {db_err}")
                    return jsonify({"error": f"Erro ao atualizar banco de dados: {str(db_err)}"}), 500

            return jsonify(port_data), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@olt_bp.route('/status/<int:id>', methods=['PUT'])
@jwt_required()
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

@olt_bp.route('/<int:id>/ports', methods=['GET'])
@jwt_required()
def get_olt_ports(id):
    olt = OLT.query.get(id)
    if not olt:
        return jsonify({"error": "OLT not found"}), 404
        

    
    if not olt.username or not olt.password:
        u, p = get_credentials(olt.ip)
        olt.username = u
        olt.password = p

    if not olt.username or not olt.password:
        return jsonify({"error": "No credentials found for this OLT"}), 400

    driver = get_olt_driver(olt)
    if not driver.connect():
        return jsonify({"error": f"Failed to connect to OLT {olt.ip}. Check credentials and connectivity."}), 500
        
    try:
        ports = driver.get_ports()
        return jsonify(ports)
    finally:
        driver.disconnect()

@olt_bp.route('/<int:id>/onus-on-port', methods=['GET'])
@jwt_required()
def get_onus_on_port(id):
    olt = OLT.query.get(id)
    if not olt:
        return jsonify({"error": "OLT not found"}), 404
        
    port = request.args.get('port')
    if not port:
        return jsonify({"error": "Port required"}), 400
        

    if not olt.username or not olt.password:
        u, p = get_credentials(olt.ip)
        olt.username = u
        olt.password = p

    if not olt.username or not olt.password:
        return jsonify({"error": "No credentials found for this OLT"}), 400

    driver = get_olt_driver(olt)
    if not driver.connect():
        return jsonify({"error": f"Failed to connect to OLT {olt.ip}"}), 500
        
    try:
        onus = driver.get_onus_on_port(port)
        return jsonify(onus)
    finally:
        driver.disconnect()

@olt_bp.route('/status/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_status(id):
    status = StatusDescription.query.get(id)
    if not status:
        return jsonify({"error": "Status not found"}), 404
    db.session.delete(status)
    db.session.commit()
    return jsonify({"message": "Deleted"})

@olt_bp.route('/', methods=['POST'])
@jwt_required()
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
@jwt_required()
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
@jwt_required()
def delete_olt(id):
    olt = OLT.query.get(id)
    if not olt:
        return jsonify({"error": "OLT not found"}), 404
    
    db.session.delete(olt)
    db.session.commit()
    return jsonify({"message": "OLT deleted"}), 200
