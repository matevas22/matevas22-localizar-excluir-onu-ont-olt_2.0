from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.telnet import search_onu_on_olt, send_command, send_command_with_confirmation
from utils.drivers import get_olt_driver
from models import StatusDescription, OLT, SystemConfig, Log, User, SignalHistory
from database import db
from datetime import datetime, timedelta
import concurrent.futures
import re

onu_bp = Blueprint('onu', __name__)

@onu_bp.route('/checkup', methods=['POST'])
@jwt_required()
def onu_checkup():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    data = request.json
    sn = data.get('sn')
    olt_ip = data.get('olt_ip')

    if not sn or not olt_ip:
        return jsonify({"error": "SN and OLT IP required"}), 400

    olt = OLT.query.filter_by(ip=olt_ip).first()
    if not olt:
        return jsonify({"error": "OLT not found"}), 404

    driver = get_olt_driver(olt)
    if not driver.connect():
        return jsonify({"error": "Failed to connect to OLT"}), 500
    
    try:
        details = driver.get_onu_details(sn)
        if details:
            return jsonify(details), 200
        else:
            return jsonify({"error": f"ONU {sn} details not found on OLT {olt_ip}"}), 404
    except Exception as e:
        print(f"Erro detalhado no checkup: {str(e)}")
        return jsonify({"error": f"Internal Driver Error: {str(e)}"}), 500
    finally:
        driver.disconnect()

@onu_bp.route('/signal-history/<sn>', methods=['GET'])
@jwt_required()
def get_signal_history(sn):
    
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    
    history = SignalHistory.query.filter(
        SignalHistory.sn == sn,
        SignalHistory.timestamp >= three_months_ago
    ).order_by(SignalHistory.timestamp.asc()).all()
    
    return jsonify([h.to_dict() for h in history]), 200

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
        return status_code, "#808080"
        
    s = StatusDescription.query.filter_by(status_code=status_code).first()
    if not s:
        s = StatusDescription.query.filter(StatusDescription.status_code.ilike(status_code)).first()
    
    if s:
        return s.description, s.color
    return status_code, "#808080"


def resolve_credentials_for_olt(olt):
    u_user_cfg = SystemConfig.query.filter_by(key='universal_username').first()
    u_pass_cfg = SystemConfig.query.filter_by(key='universal_password').first()

    username = olt.username if olt and olt.username else (u_user_cfg.value if u_user_cfg else None)
    password = olt.password if olt and olt.password else (u_pass_cfg.value if u_pass_cfg else None)

    return username, password


def normalize_onu_interface(interface):
    if not interface:
        return interface

    if interface.startswith('gpon-onu_'):
        return interface

    if re.match(r'^\d+/\d+/\d+:\d+$', interface):
        return f'gpon-onu_{interface}'

    return interface


def get_wifi_port_for_band(band):
    normalized = str(band).strip().lower()
    if normalized in ('1', 'ssid1', '2.4', '2.4g', '2.4ghz', 'wifi_0/1'):
        return 'wifi_0/1'
    if normalized in ('5', 'ssid5', '5g', '5ghz', 'wifi_0/5'):
        return 'wifi_0/5'
    return None


def _outputs_have_invalid_command(outputs):
    if not outputs:
        return True

    joined = "\n".join(outputs if isinstance(outputs, list) else [str(outputs)]).lower()
    return (
        '%error 20200' in joined
        or 'invalid input detected' in joined
        or 'invalid command' in joined
    )


def _build_onu_action_attempts(interface, action):
    if action == 'restore':
        return [
            ['conf t', f'pon-onu-mng {interface}', 'restore wifi', 'end'],
            ['conf t', f'pon-onu-mng {interface}', 'restore factory', 'end'],
            ['conf t', f'interface {interface}', 'restore', 'end'],
        ]

    if action == 'reboot':
        return [
            ['conf t', f'pon-onu-mng {interface}', 'reboot', 'end'],
            ['conf t', f'interface {interface}', 'reboot', 'end'],
            ['conf t', f'interface {interface}', 'onu reboot', 'end'],
        ]

    return [
        ['conf t', f'interface {interface}', action, 'end'],
    ]


def _execute_onu_action_with_fallback(context, action):
    attempts = _build_onu_action_attempts(context['interface'], action)
    last_outputs = []
    last_commands = attempts[-1]

    for idx, commands in enumerate(attempts, start=1):
        print(f"[ACS] Attempt {idx} for {action}: {commands}")
        outputs = send_command_with_confirmation(
            context['olt_ip'],
            commands,
            context['username'],
            context['password']
        ) or []

        last_outputs = outputs
        last_commands = commands

        if not _outputs_have_invalid_command(outputs):
            return {
                'success': True,
                'outputs': outputs,
                'attempt': idx,
                'commands': commands,
            }

    return {
        'success': False,
        'outputs': last_outputs,
        'attempt': len(attempts),
        'commands': last_commands,
    }


def extract_first_float(text):
    if not text:
        return None

    match = re.search(r'(-?\d+\.\d+)', text)
    if match:
        return float(match.group(1))

    return None


def extract_onu_identity(detail_output, fallback_sn=None):
    sn_patterns = [
        # ZTE format: "Serial number:       ZTEGDB057C13"
        r'^\s*Serial(?: Number|\s+number)?:\s*([A-Za-z0-9_-]+?)\s*$',
        # Generic SN patterns
        r'(?:SN|Serial(?: Number)?|Serial)\s*:\s*([A-Za-z0-9_-]+)',
        r'(?:SN|Serial(?: Number)?|Serial)\s+([A-Za-z0-9_-]{8,})',
        # Fallback: look for 12-char code
        r'\b([A-Z0-9]{12})\b',
    ]

    for pattern in sn_patterns:
        match = re.search(pattern, detail_output or "", re.IGNORECASE | re.MULTILINE)
        if match:
            value = match.group(1).strip()
            if len(value) >= 8:
                return value

    return fallback_sn


def extract_ssid_snapshot(*outputs):
    combined = "\n".join([output for output in outputs if output])
    ssid1 = "N/A"
    ssid5 = "N/A"
    matched_lines = []

    for raw_line in combined.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if re.search(r'\bssid\b', line, re.IGNORECASE) or re.search(r'\bwifi\b', line, re.IGNORECASE):
            matched_lines.append(line)

            if ssid1 == "N/A" and re.search(r'(?:ssid\s*1|ssid1|2\.4)', line, re.IGNORECASE):
                ssid1 = line.split(':', 1)[1].strip() if ':' in line else line

            if ssid5 == "N/A" and re.search(r'(?:ssid\s*5|ssid5|5g|5ghz)', line, re.IGNORECASE):
                ssid5 = line.split(':', 1)[1].strip() if ':' in line else line

    return {
        'ssid1': ssid1,
        'ssid5': ssid5,
        'raw': matched_lines[-20:]
    }


def extract_recent_log_lines(output, limit=40):
    if not output:
        return []

    lines = []
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.lower().startswith('show logging'):
            continue
        lines.append(line)

    return lines[-limit:]


def find_onu_context(sn=None, olt_ip=None, interface=None):
    normalized_interface = normalize_onu_interface(interface)

    if olt_ip:
        olt = OLT.query.filter_by(ip=olt_ip).first()
        if not olt:
            return None

        username, password = resolve_credentials_for_olt(olt)
        if not username or not password:
            return None

        if normalized_interface:
            return {
                'olt_ip': olt.ip,
                'olt_name': olt.name,
                'interface': normalized_interface,
                'username': username,
                'password': password,
                'sn': sn,
            }

        raw_output = search_onu_on_olt(olt.ip, sn, username, password)
        if not raw_output:
            return None

        for line in raw_output.split('\n'):
            if 'gpon-onu_' in line and not line.strip().startswith(f'show gpon onu by sn {sn}'):
                parts = line.split()
                for part in parts:
                    if part.startswith('gpon-onu_'):
                        return {
                            'olt_ip': olt.ip,
                            'olt_name': olt.name,
                            'interface': part,
                            'username': username,
                            'password': password,
                            'sn': sn,
                        }
        return None

    olt_data_list = get_olts_with_credentials()

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

                    for line in raw_output.split('\n'):
                        if 'gpon-onu_' in line and not line.strip().startswith(f'show gpon onu by sn {sn}'):
                            parts = line.split()
                            for part in parts:
                                if part.startswith('gpon-onu_'):
                                    return {
                                        'olt_ip': c_ip,
                                        'olt_name': c_name,
                                        'interface': part,
                                        'username': olt_data_list[idx]['username'],
                                        'password': olt_data_list[idx]['password'],
                                        'sn': sn,
                                    }
            except Exception as exc:
                print(f'{olt_data_list[idx]["ip"]} generated an exception: {exc}')

    return None


def load_onu_operational_data(context, sn):
    olt_ip = context['olt_ip']
    interface = context['interface']
    c_user = context['username']
    c_pass = context['password']

    olt_interface = interface.replace('gpon-onu_', 'gpon-olt_').split(':')[0]
    
    print(f'[DEBUG] load_onu_operational_data - interface={interface}, olt_interface={olt_interface}')

    commands = [
        f'show gpon onu detail-info {interface}',
        f'show pon power onu-rx {interface}',
        f'show pon power olt-rx {interface}',
        f'show pon power onu-tx {interface}',
        f'show pon power olt-tx {olt_interface}',
        f'show gpon onu state {olt_interface}',
        'show running-config | include ssid',
        'show running-config | include wifi',
    ]

    outputs = send_command(olt_ip, commands, c_user, c_pass)
    if not outputs:
        return None

    detail_output = outputs[0] if len(outputs) > 0 else ''
    rx_onu_output = outputs[1] if len(outputs) > 1 else ''
    rx_olt_output = outputs[2] if len(outputs) > 2 else ''
    tx_onu_output = outputs[3] if len(outputs) > 3 else ''
    tx_olt_output = outputs[4] if len(outputs) > 4 else ''
    state_output = outputs[5] if len(outputs) > 5 else ''
    ssid_cfg_1 = outputs[6] if len(outputs) > 6 else ''
    ssid_cfg_2 = outputs[7] if len(outputs) > 7 else ''

    print(f'[DEBUG] detail_output length: {len(detail_output)}')
    if detail_output:
        print(f'[DEBUG] detail_output preview (first 300 chars): {detail_output[:300]}')

    status = 'Unknown'
    rx_onu = -99.9
    rx_olt = -99.9
    tx_olt = 'N/A'
    tx_onu = -99.9
    distance = 'N/A'
    uptime = 'N/A'
    name = 'N/A'

    name_match = re.search(r'^\s*Name:\s*(.+?)\s*$', detail_output, re.IGNORECASE | re.MULTILINE)
    if name_match:
        name = name_match.group(1).strip()
        print(f'[DEBUG] Extracted name from Name field: {name}')
    else:
        desc_match = re.search(r'^\s*Description:\s*(.+?)\s*$', detail_output, re.IGNORECASE | re.MULTILINE)
        if desc_match:
            name = desc_match.group(1).strip()
            print(f'[DEBUG] Extracted name from Description field: {name}')
        else:
            print(f'[DEBUG] Could not extract name - no match found')

    dist_match = re.search(r'^\s*ONU Distance:\s*(\d+\s*m)', detail_output, re.IGNORECASE | re.MULTILINE)
    if dist_match:
        distance = dist_match.group(1).strip()
        print(f'[DEBUG] Extracted distance: {distance}')

    uptime_match = re.search(r'^\s*(?:Online Duration|Uptime):\s*(.+?)\s*$', detail_output, re.IGNORECASE | re.MULTILINE)
    if uptime_match:
        uptime = uptime_match.group(1).strip()
        print(f'[DEBUG] Extracted uptime: {uptime}')
    else:
        print(f'[DEBUG] Could not extract uptime')

    phase_match = re.search(r'(?:Phase state|State)\s*:\s*(\w+)', detail_output, re.IGNORECASE)
    if phase_match:
        status = phase_match.group(1)

    short_interface = interface.replace('gpon-onu_', '')
    state_match = re.search(rf'^{re.escape(short_interface)}\s+\S+\s+\S+\s+(\S+)', state_output, re.MULTILINE)
    if state_match:
        status = state_match.group(1)

    rx_value = extract_first_float(rx_onu_output)
    if rx_value is not None:
        rx_onu = rx_value

    olt_rx_value = extract_first_float(rx_olt_output)
    if olt_rx_value is not None:
        rx_olt = olt_rx_value

    tx_value = extract_first_float(tx_onu_output)
    if tx_value is not None:
        tx_onu = tx_value
    else:
        tx_onu_match = re.search(r'(?:Tx optical power|Tx power|Transmitted optical power)\s*:\s*(-?\d+\.\d+)', detail_output, re.IGNORECASE)
        if tx_onu_match:
            tx_onu = float(tx_onu_match.group(1))

    olt_tx_match = re.search(r'(-?\d+\.\d+)\(dbm\)', tx_olt_output, re.IGNORECASE)
    if olt_tx_match:
        tx_olt = float(olt_tx_match.group(1))

    desc, color = get_status_info(status)
    wifi = extract_ssid_snapshot(ssid_cfg_1, ssid_cfg_2, detail_output)

    resolved_sn = extract_onu_identity(detail_output, context.get('sn') if context else sn)

    return {
        'sn': resolved_sn,
        'olt': context['olt_name'],
        'olt_ip': olt_ip,
        'interface': interface,
        'status': status,
        'status_description': desc,
        'status_color': color,
        'name': name,
        'distance': distance,
        'uptime': uptime,
        'signals': {
            'rxOnu': rx_onu,
            'txOnu': tx_onu,
            'rxOlt': rx_olt,
            'txOlt': tx_olt,
        },
        'wifi': wifi,
        'diagnostic': {
            'detail': detail_output,
            'state': state_output,
            'rx_onu': rx_onu_output,
            'rx_olt': rx_olt_output,
            'tx_onu': tx_onu_output,
            'tx_olt': tx_olt_output,
        }
    }


def run_onu_action(context, commands, username):
    outputs = send_command(
        context['olt_ip'],
        commands,
        context['username'],
        context['password']
    )

    if not outputs:
        raise RuntimeError('No response returned by OLT')

    resolved_sn = context.get('sn')
    if not resolved_sn:
        details = load_onu_operational_data(context, None)
        resolved_sn = details.get('sn') if details else None

    return outputs, resolved_sn


def write_onu_log(username, action, sn, details):
    log = Log(
        username=username,
        action=action,
        ip_address=request.remote_addr,
        system_info=str(request.user_agent),
        details=details,
    )
    db.session.add(log)
    db.session.commit()
    return log


@onu_bp.route('/acs/<sn>', methods=['GET'])
@jwt_required()
def get_onu_acs_summary(sn):
    olt_ip = request.args.get('olt_ip')
    interface = request.args.get('interface')

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    try:
        payload = load_onu_operational_data(context, sn)
        if not payload:
            return jsonify({'error': 'Failed to read ONU data'}), 500
        return jsonify(payload), 200
    except Exception as exc:
        print(f'Erro ao carregar ACS da ONU {sn}: {exc}')
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/interface-info', methods=['GET'])
@jwt_required()
def get_onu_interface_info():
    olt_ip = request.args.get('olt_ip')
    interface = request.args.get('interface')

    print(f'[DEBUG] interface-info called with olt_ip={olt_ip}, interface={interface}')

    if not olt_ip or not interface:
        return jsonify({'error': 'OLT IP and interface are required'}), 400

    context = find_onu_context(olt_ip=olt_ip, interface=interface)
    print(f'[DEBUG] find_onu_context returned: {bool(context)}')
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    try:
        payload = load_onu_operational_data(context, context.get('sn'))
        if payload:
            print(f'[DEBUG] Payload SN={payload.get("sn")}, Name={payload.get("name")}, Uptime={payload.get("uptime")}')
        if not payload:
            return jsonify({'error': 'Failed to read ONU data'}), 500
        return jsonify(payload), 200
    except Exception as exc:
        print(f'Erro ao carregar detalhe da ONU por interface: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/logs', methods=['GET'])
@jwt_required()
def get_onu_acs_logs(sn):
    olt_ip = request.args.get('olt_ip')
    interface = request.args.get('interface')

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    try:
        outputs = send_command(
            context['olt_ip'],
            ['show logging'],
            context['username'],
            context['password']
        )

        raw_output = outputs[0] if outputs else ''
        return jsonify({
            'sn': sn,
            'olt_ip': context['olt_ip'],
            'interface': context['interface'],
            'logs': extract_recent_log_lines(raw_output),
            'raw': raw_output,
        }), 200
    except Exception as exc:
        print(f'Erro ao ler logs da ONU {sn}: {exc}')
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/password', methods=['POST'])
@jwt_required()
def update_onu_password(sn):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else 'Unknown'

    data = request.json or {}
    new_password = data.get('new_password', '').strip()
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')

    if not new_password:
        return jsonify({'error': 'New password is required'}), 400

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    commands = [
        'conf t',
        f"interface {context['interface']}",
        f'password {new_password}',
        'end',
    ]

    try:
        outputs = send_command(
            context['olt_ip'],
            commands,
            context['username'],
            context['password']
        )

        write_onu_log(
            username,
            f'Alterou senha ONU: {sn}',
            sn,
            f"Senha alterada na ONU {sn} ({context['olt_ip']} / {context['interface']})."
        )

        return jsonify({
            'message': 'Senha da ONU atualizada com sucesso',
            'outputs': outputs or []
        }), 200
    except Exception as exc:
        print(f'Erro ao alterar senha da ONU {sn}: {exc}')
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/name', methods=['POST'])
@jwt_required()
def update_onu_name(sn):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else 'Unknown'

    data = request.json or {}
    new_name = data.get('new_name', '').strip()
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')

    if not new_name:
        return jsonify({'error': 'New name is required'}), 400

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    commands = [
        'conf t',
        f"interface {context['interface']}",
        f'name {new_name}',
        'end',
    ]

    try:
        outputs = send_command(
            context['olt_ip'],
            commands,
            context['username'],
            context['password']
        )

        write_onu_log(
            username,
            f'Alterou nome ONU: {sn}',
            sn,
            f"Nome alterado na ONU {sn} ({context['olt_ip']} / {context['interface']}) para {new_name}."
        )

        return jsonify({
            'message': 'Nome da ONU atualizado com sucesso',
            'outputs': outputs or []
        }), 200
    except Exception as exc:
        print(f'Erro ao alterar nome da ONU {sn}: {exc}')
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/restore', methods=['POST'])
@jwt_required()
def restore_onu(sn):
    print(f"\n=== RESTORE ENDPOINT CALLED ===")
    print(f"SN: {sn}")
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else 'Unknown'

    data = request.json or {}
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')
    
    print(f"OLT IP: {olt_ip}, Interface: {interface}")

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        print(f"ONU context not found for {sn}")
        return jsonify({'error': 'ONU not found'}), 404

    try:
        execution = _execute_onu_action_with_fallback(context, 'restore')
        outputs = execution['outputs']
        print(f"Restore execution result: {execution}")

        if not execution['success']:
            return jsonify({
                'error': 'Falha ao restaurar ONU: comando nao suportado na CLI atual da OLT',
                'outputs': outputs,
                'attempted_commands': _build_onu_action_attempts(context['interface'], 'restore')
            }), 400

        write_onu_log(
            username,
            f'Restaurou ONU: {sn}',
            sn,
            f"Restore solicitado na ONU {sn} ({context['olt_ip']} / {context['interface']})."
        )

        return jsonify({
            'message': 'Restore da ONU solicitado com sucesso',
            'attempt': execution['attempt'],
            'commands': execution['commands'],
            'outputs': outputs or []
        }), 200
    except Exception as exc:
        print(f'Erro ao restaurar ONU {sn}: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/wifi', methods=['POST'])
@jwt_required()
def update_onu_wifi(sn):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else 'Unknown'

    data = request.json or {}
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')
    band = data.get('band')
    ssid_name = (data.get('ssid_name') or '').strip()
    ssid_password = (data.get('ssid_password') or '').strip()

    wifi_port = get_wifi_port_for_band(band)
    if not wifi_port:
        return jsonify({'error': 'Invalid SSID band. Use 1 or 5.'}), 400

    if not ssid_name and not ssid_password:
        return jsonify({'error': 'SSID name or password is required'}), 400

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        return jsonify({'error': 'ONU not found'}), 404

    commands = ['conf t', f"interface {context['interface']}"]

    if ssid_password:
        commands.append(
            f'ssid auth wpa {wifi_port} wpa-wpa2-psk key {ssid_password}'
        )

    if ssid_name:
        commands.append(f'ssid ctrl {wifi_port} name {ssid_name}')

    commands.append('end')

    try:
        outputs = send_command(
            context['olt_ip'],
            commands,
            context['username'],
            context['password']
        )

        action_parts = []
        if ssid_name:
            action_parts.append(f'nome SSID {wifi_port} = {ssid_name}')
        if ssid_password:
            action_parts.append(f'senha SSID {wifi_port} atualizada')

        write_onu_log(
            username,
            f'Atualizou Wi-Fi ONU: {sn}',
            sn,
            f"Wi-Fi atualizado na ONU {sn} ({context['olt_ip']} / {context['interface']} / {wifi_port}). "
            + '; '.join(action_parts)
        )

        return jsonify({
            'message': 'Configuração Wi-Fi atualizada com sucesso',
            'band': band,
            'wifi_port': wifi_port,
            'outputs': outputs or []
        }), 200
    except Exception as exc:
        print(f'Erro ao atualizar Wi-Fi da ONU {sn}: {exc}')
        return jsonify({'error': str(exc)}), 500


@onu_bp.route('/acs/<sn>/reboot', methods=['POST'])
@jwt_required()
def reboot_onu(sn):
    print(f"\n=== REBOOT ENDPOINT CALLED ===")
    print(f"SN: {sn}")
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else 'Unknown'

    data = request.json or {}
    olt_ip = data.get('olt_ip')
    interface = data.get('interface')
    
    print(f"OLT IP: {olt_ip}, Interface: {interface}")

    context = find_onu_context(sn, olt_ip=olt_ip, interface=interface)
    if not context:
        print(f"ONU context not found for {sn}")
        return jsonify({'error': 'ONU not found'}), 404

    try:
        execution = _execute_onu_action_with_fallback(context, 'reboot')
        outputs = execution['outputs']
        print(f"Reboot execution result: {execution}")

        if not execution['success']:
            return jsonify({
                'error': 'Falha ao reiniciar ONU: comando nao suportado na CLI atual da OLT',
                'outputs': outputs,
                'attempted_commands': _build_onu_action_attempts(context['interface'], 'reboot')
            }), 400

        write_onu_log(
            username,
            f'Reiniciou ONU: {sn}',
            sn,
            f"Reboot solicitado na ONU {sn} ({context['olt_ip']} / {context['interface']})."
        )

        return jsonify({
            'message': 'Reboot da ONU solicitado com sucesso',
            'attempt': execution['attempt'],
            'commands': execution['commands'],
            'outputs': outputs or []
        }), 200
    except Exception as exc:
        print(f'Erro ao reiniciar ONU {sn}: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500

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
    
    found_onus = []
    
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
                                    found_onus.append({
                                        "olt_ip": c_ip,
                                        "olt_name": c_name,
                                        "interface": part,
                                        "raw_line": line,
                                        "username": olt_data_list[idx]['username'],
                                        "password": olt_data_list[idx]['password']
                                    })
            except Exception as exc:
                print(f'{olt_data_list[idx]["ip"]} generated an exception: {exc}')

    if not found_onus:
        return jsonify({"error": "ONU not found on any OLT"}), 404
    
    results = []

    for onu_data in found_onus:
        olt_ip = onu_data['olt_ip']
        interface = onu_data['interface']
        c_user = onu_data['username']
        c_pass = onu_data['password']

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

        results.append({
            "sn": sn,
            "olt": onu_data['olt_name'],
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
        })

    return jsonify(results)

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
    cmd_tx_olt = f"show pon power olt-tx {olt_interface}" 
    cmd_state = f"show gpon onu state {olt_interface}" 

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

    try:
        olt_record = OLT.query.filter_by(ip=olt_ip).first()
        if olt_record:
            new_history = SignalHistory(
                sn=sn,
                olt_id=olt_record.id,
                rx_power=rx_onu,
                tx_power=tx_onu
            )
            db.session.add(new_history)
            db.session.commit()
    except Exception as e:
        print(f"Erro ao salvar histórico global: {str(e)}")
        db.session.rollback()

    response = {
        "sn": sn,
        "olt": found_onu['olt_name'],
        "olt_ip": olt_ip,
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

@onu_bp.route('/<sn>', methods=['DELETE'])
@jwt_required()
def delete_onu_by_sn(sn):
    print(f"DEBUG: Deleting ONU with SN: {sn} from ALL interfaces")
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    username = user.username if user else "Unknown"
    
    olt_data_list = get_olts_with_credentials()
    found_onus = []
    
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
                    lines = raw_output.split('\n')
                    for line in lines:
                        # Ex: gpon-onu_1/2/1:1
                        if "gpon-onu_" in line and not line.strip().startswith(f"show gpon onu by sn {sn}"):
                            parts = line.split()
                            for part in parts:
                                if part.startswith("gpon-onu_"):
                                    found_onus.append({
                                        "olt_ip": c_ip,
                                        "interface": part,
                                        "username": olt_data_list[idx]['username'],
                                        "password": olt_data_list[idx]['password']
                                    })
            except Exception as exc:
                print(f"Error searching {olt_data_list[idx]['ip']}: {exc}")
    
    if not found_onus:
        return jsonify({"error": "ONU não encontrada para exclusão"}), 404

    results_log = []
    success_count = 0
    
    for item in found_onus:
        interface_full = item['interface']
        match = re.search(r"gpon-onu_(.*?):(\d+)", interface_full)
        
        if not match:
            results_log.append(f"Interface invalida: {interface_full} na OLT {item['olt_ip']}")
            continue
            
        gpon_port = match.group(1) # ex: 1/1/1
        onu_id = match.group(2)    # ex: 2
        
        commands = [
            "conf t",
            f"interface gpon-olt_{gpon_port}",
            f"no onu {onu_id}",
            "exit",
            "exit"
        ]
        
        try:
            send_command(
                item['olt_ip'], 
                commands, 
                item['username'], 
                item['password']
            )
            success_count += 1
            results_log.append(f"Removido de {item['olt_ip']} interface {interface_full}")
            
        except Exception as e:
            results_log.append(f"Erro ao remover de {item['olt_ip']} interface {interface_full}: {str(e)}")

    log_detail = "; ".join(results_log)
    log = Log(
        username=username,
        action=f"Excluiu ONU: {sn}",
        ip_address=request.remote_addr,
        system_info=str(request.user_agent),
        details=f"Tentativa de remoção em {len(found_onus)} locais. {log_detail}"
    )
    db.session.add(log)
    db.session.commit()

    if success_count > 0:
        return jsonify({"message": f"Operação conclui­da. {success_count}/{len(found_onus)} removidas com sucesso.", "details": results_log}), 200
    else:
        return jsonify({"error": "Falha ao remover ONU de todas as interfaces encontradas.", "details": results_log}), 500



