from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.telnet import search_onu_on_olt, send_command
from ..models import StatusDescription, OLT, SystemConfig, Log, User
from ..database import db
import concurrent.futures
import re

onu_bp = Blueprint('onu', __name__)

def get_olts_with_credentials():
    olts = OLT.query.all()
    
    u_user_cfg = SystemConfig.query.filter_by(key='universal_username').first()
    u_pass_cfg = SystemConfig.query.filter_by(key='universal_password').first()
    
    univ_user = u_user_cfg.value if u_user_cfg else None
    univ_pass = u_pass_cfg.value if u_pass_cfg else None
    
    results = []
    for olt in olts:
        user = olt.username if olt.username else univ_user
        pwd = olt.password if olt.password else univ_pass
        
        if user and pwd:
            results.append({
                'ip': olt.ip,
                'name': olt.name,
                'username': user,
                'password': pwd
            })
        else:
            print(f"Skipping OLT {olt.ip} - Missing credentials")
            
    return results

def get_status_info(status_code):
    if not status_code:
        return status_code, "gray"
        
    # Optimistic lookup
    s = StatusDescription.query.filter_by(status_code=status_code).first()
    if not s:
        s = StatusDescription.query.filter_by(status_code=status_code.lower()).first()
    
    if s:
        return s.description, s.color
    return status_code, "gray"

@onu_bp.route('/locate', methods=['POST'])
@jwt_required()
def locate_onu_endpoint():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else "Unknown"
    
    print("DEBUG: /locate endpoint hit")
    data = request.json
    sn = data.get('sn')
    print(f"DEBUG: Searching for SN: {sn} by user {username}")

    if not sn or len(sn) != 12:
        return jsonify({"error": "Invalid SN provided"}), 400

    log = Log(
        username=username, 
        action=f"Localizou ONU: {sn}",
        ip_address=request.remote_addr,
        system_info=str(request.user_agent),
        details=f"Busca realizada para o SN: {sn}"
    )
    db.session.add(log)
    db.session.commit()
    
    olt_data_list = get_olts_with_credentials()
    
    found_onu = None
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_idx = {
            executor.submit(
                search_onu_on_olt, 
                d['ip'], 
                sn, 
                d['username'], 
                d['password']
            ): i 
            for i, d in enumerate(olt_data_list)
        }
        
        for future in concurrent.futures.as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                raw_output = future.result()
                if raw_output:
                    c_ip = olt_data_list[idx]['ip']
                    c_name = olt_data_list[idx]['name']
                    
                    lines = raw_output.split('\n')
                    for line in lines:
                        if "gpon-onu_" in line and not line.strip().startswith(f"show gpon onu by sn {sn}"):
                            parts = line.split()
                            for part in parts:
                                if part.startswith("gpon-onu_"):
                                    found_onu = {
                                        "olt_ip": c_ip,
                                        "olt_name": c_name,
                                        "interface": part,
                                        "raw_line": line,
                                        "username": olt_data_list[idx]['username'],
                                        "password": olt_data_list[idx]['password']
                                    }
                                    break
                        if found_onu: break
                
                if found_onu:
                    for f in future_to_idx:
                        f.cancel()
                    break

            except Exception as exc:
                print(f'{olt_data_list[idx]["ip"]} generated an exception: {exc}')

    if not found_onu:
        return jsonify({"error": "ONU not found on any OLT"}), 404
    
    olt_ip = found_onu['olt_ip']
    interface = found_onu['interface']
    c_user = found_onu['username']
    c_pass = found_onu['password']

    status = "Unknown"
    rx_onu = -99.9 
    tx_olt = -99.9  
    rx_olt = -99.9 
    tx_onu = -99.9 
    
    cmd_detail = f"show gpon onu detail-info {interface}"
    cmd_rx_onu = f"show pon power onu-rx {interface}"
    cmd_rx_olt = f"show pon power olt-rx {interface}"
    
    commands = [cmd_detail, cmd_rx_onu, cmd_rx_olt]
    command_outputs = send_command(olt_ip, commands, c_user, c_pass)
    
    if command_outputs and len(command_outputs) >= 3:
        detail_output = command_outputs[0]
        rx_output = command_outputs[1]
        olt_rx_output = command_outputs[2]

        phase_match = re.search(r"Phase state:\s+(\w+)", detail_output, re.IGNORECASE)
        if phase_match:
            status = phase_match.group(1)
            
        rx_match = re.search(r"Rx\s*power\s*:\s*(-?\d+\.?\d*)", rx_output, re.IGNORECASE)
        if not rx_match:
             rx_match = re.search(r"(-?\d+\.\d+)", rx_output)
             
        if rx_match:
            rx_onu = float(rx_match.group(1))

        olt_rx_match = re.search(r"(-?\d+\.\d+)", olt_rx_output)
        if olt_rx_match:
            rx_olt = float(olt_rx_match.group(1))

    desc, color = get_status_info(status)

    response = {
        "sn": sn,
        "olt": found_onu['olt_name'],
        "ip": olt_ip,
        "interface": interface,
        "status": status,
        "status_description": desc,
        "status_color": color,
        "signals": {
            "rxOnu": rx_onu,
            "txOnu": 2.2,
            "rxOlt": rx_olt,
            "txOlt": 3.5 
        }
    }

    return jsonify(response)

@onu_bp.route('/signal/<sn>', methods=['GET'])
@jwt_required()
def get_onu_signal(sn):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else "Unknown"

    if not sn or len(sn) != 12:
        return jsonify({"error": "Invalid SN provided"}), 400

    log = Log(
        username=username, 
        action=f"Verificou sinal de: {sn}",
        ip_address=request.remote_addr,
        system_info=str(request.user_agent),
        details=f"Verificou sinal para o SN: {sn}"
    )
    db.session.add(log)
    db.session.commit()

    olt_data_list = get_olts_with_credentials()
    results = [None] * len(olt_data_list)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_idx = {
            executor.submit(
                search_onu_on_olt, 
                d['ip'], 
                sn, 
                d['username'], 
                d['password']
            ): i 
            for i, d in enumerate(olt_data_list)
        }
        for future in concurrent.futures.as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                data = future.result()
                results[idx] = data
            except Exception as exc:
                print(f'{olt_data_list[idx]["ip"]} generated an exception: {exc}')

    found_onu = None
    for i, raw_output in enumerate(results):
        if raw_output:
            c_ip = olt_data_list[i]['ip']
            c_name = olt_data_list[i]['name']
            
            lines = raw_output.split('\n')
            for line in lines:
                if "gpon-onu_" in line:
                    parts = line.split()
                    for part in parts:
                        if part.startswith("gpon-onu_"):
                            found_onu = {
                                "olt_ip": c_ip,
                                "olt_name": c_name,
                                "interface": part,
                                "raw_line": line,
                                "username": olt_data_list[i]['username'],
                                "password": olt_data_list[i]['password']
                            }
                            break
                if found_onu: break
        if found_onu: break

    if not found_onu:
        return jsonify({"error": "ONU not found"}), 404

    olt_ip = found_onu['olt_ip']
    interface = found_onu['interface']
    c_user = found_onu['username']
    c_pass = found_onu['password']
    
    status = "Unknown"
    rx_onu = -99.9 
    rx_olt = -99.9 
    tx_olt = "N/A"   
    tx_onu = 2.4    
    
    
    olt_interface = interface.replace("gpon-onu_", "gpon-olt_").split(":")[0]

    cmd_detail = f"show gpon onu detail-info {interface}"
    cmd_rx_onu = f"show pon power onu-rx {interface}"
    cmd_rx_olt = f"show pon power olt-rx {interface}"
    cmd_tx_onu = f"show pon power onu-tx {interface}" 
    cmd_tx_olt = f"show pon power olt-tx {olt_interface}" # Correct command for OLT TX
    cmd_state = f"show gpon onu state {olt_interface}" # Correct command for ONU State

    commands = [cmd_detail, cmd_rx_onu, cmd_rx_olt, cmd_tx_onu, cmd_tx_olt, cmd_state]
    outputs = send_command(olt_ip, commands, c_user, c_pass)
    
    status = "Unknown"
    rx_onu = -99.9  
    rx_olt = -99.9  
    tx_olt = "N/A"  
    tx_onu = -99.9  
    
    distance = "N/A"
    uptime = "N/A"
    name = "N/A"

    if outputs:
        print("DEBUG: Raw Detail Output:", outputs[0])
        print("DEBUG: Raw RX ONU Output:", outputs[1])
        print("DEBUG: Raw RX OLT Output:", outputs[2])
        print("DEBUG: Raw TX ONU Output:", outputs[3])
        if len(outputs) > 4:
             print("DEBUG: Raw OLT TX Output:", outputs[4])
        if len(outputs) > 5:
             print("DEBUG: Raw State Output:", outputs[5])

        detail_output = outputs[0]
        rx_onu_output = outputs[1]
        rx_olt_output = outputs[2]
        tx_onu_output = outputs[3]
        tx_olt_output = outputs[4] if len(outputs) > 4 else ""
        state_output = outputs[5] if len(outputs) > 5 else ""

        name_match = re.search(r"(?:Name|Description)\s*:\s*(.+)", detail_output, re.IGNORECASE)
        if name_match:
            name = name_match.group(1).strip()
            
        dist_match = re.search(r"Distance\s*:\s*(\d+\s*m)", detail_output, re.IGNORECASE)
        if dist_match:
            distance = dist_match.group(1).strip()
            
        uptime_match = re.search(r"(?:Online Duration|Uptime)\s*:\s*(.+)", detail_output, re.IGNORECASE)
        if uptime_match:
            uptime = uptime_match.group(1).strip()
            
        phase_match = re.search(r"(?:Phase state|State)\s*:\s*(\w+)", detail_output, re.IGNORECASE)
        if phase_match:
            status = phase_match.group(1)
        
        
        short_interface = interface.replace("gpon-onu_", "") # e.g. "1/2/1:1"
        
        
        state_match = re.search(rf"^{re.escape(short_interface)}\s+\S+\s+\S+\s+(\S+)", state_output, re.MULTILINE)
        if state_match:
             status = state_match.group(1)

        rx_match = re.search(r"(-?\d+\.\d+)", rx_onu_output)
        if rx_match:
            rx_onu = float(rx_match.group(1))

        olt_rx_match = re.search(r"(-?\d+\.\d+)", rx_olt_output)
        if olt_rx_match:
            rx_olt = float(olt_rx_match.group(1))
            
        onu_tx_match = re.search(r"(-?\d+\.\d+)", tx_onu_output)
        if onu_tx_match:
            tx_onu = float(onu_tx_match.group(1))
        else:
            tx_onu_match = re.search(r"(?:Tx optical power|Tx power|Transmitted optical power)\s*:\s*(-?\d+\.\d+)", detail_output, re.IGNORECASE)
            if tx_onu_match:
                 tx_onu = float(tx_onu_match.group(1))
                 
        olt_tx_match = re.search(r"(-?\d+\.\d+)\(dbm\)", tx_olt_output, re.IGNORECASE)
        if olt_tx_match:
             tx_olt = float(olt_tx_match.group(1))


    desc, color = get_status_info(status)

    response = {
        "sn": sn,
        "olt": found_onu['olt_name'],
        "ip": olt_ip,
        "interface": interface,
        "status": status,
        "status_description": desc,
        "status_color": color,
        "name": name,
        "distance": distance,
        "uptime": uptime,
        "signals": {
            "rxOnu": rx_onu,  
            "txOnu": tx_onu, 
            "rxOlt": rx_olt,  
            "txOlt": tx_olt    
        }
    }
    return jsonify(response)

@onu_bp.route('/signal', methods=['POST'])
def check_signal():
    data = request.json
    olt_ip = data.get('olt_ip')
    interface = data.get('interface') 
    
    if not olt_ip or not interface:
        return jsonify({"error": "Missing OLT IP or Interface"}), 400

    cmd_rx_onu = f"show pon power onu-rx {interface}"
    cmd_tx_onu = f"show pon power onu-tx {interface}"
    
    commands = [cmd_rx_onu, cmd_tx_onu]
    
    logs = send_command(olt_ip, commands)
    
    return jsonify({"logs": logs})

@onu_bp.route('/delete', methods=['DELETE'])
def delete_onu():
    data = request.json
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')
    
    if not olt_ip or not interface:
        return jsonify({"error": "Missing info"}), 400

    try:
        match = re.search(r"gpon-onu_(.*?):(\d+)", interface)
        if match:
            gpon_interface = f"gpon-olt_{match.group(1)}"
            onu_index = match.group(2)
            
            commands = [
                "conf t",
                f"interface {gpon_interface}",
                f"no onu {onu_index}",
                "exit"
            ]
            
            send_command(olt_ip, commands)
            return jsonify({"msg": "ONU deletion command sent"}), 200
        else:
            return jsonify({"error": "Invalid interface format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
