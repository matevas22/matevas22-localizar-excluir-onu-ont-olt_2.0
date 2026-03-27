import threading
import time
import json
import re
import os
from datetime import datetime
from netmiko import ConnectHandler
from database import db
from models import OLT, SystemConfig, OLTMonitorData

def parse_onu_state(output: str):
    lines = output.strip().split('\n')
    onus = []
    
    if len(lines) < 2 or '%Code' in output or '%Error' in output:
        return {'onus': [], 'total': '0/0'}
    
    # Regex flexível para capturar (Porta/Slot/Pon:ID) STATUS (Admin) (OMCC) (Phase)
    # Ex: 1/1/1:1 working enable enable up
    # Stage 1: Tenta capturar 5 colunas (incluindo Channel/Command)
    for line in lines:
        line = line.strip()
        if not line: continue
        
        match_5 = re.search(r'(\d+/\d+/\d+:\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)', line)
        if match_5:
            onu_id, phase, admin, omcc, channel = match_5.groups()
            onus.append({
                'onu_id': onu_id,
                'phase_state': phase,
                'admin_state': admin,
                'omcc_state': omcc,
                'channel': channel
            })
            continue

        match_4 = re.search(r'(\d+/\d+/\d+:\d+)\s+(\S+)\s+(\S+)\s+(\S+)', line)
        if match_4:
            onu_id, phase, admin, omcc = match_4.groups()
            onus.append({
                'onu_id': onu_id,
                'phase_state': phase,
                'admin_state': admin,
                'omcc_state': omcc,
                'channel': 'N/A'
            })
            continue
    
    onu_num_match = re.search(r'(?:ONU Number|Total ONU):\s*(\d+)/?(\d+)?', output, re.IGNORECASE)
    
    t_found = len(onus)
    t_total = "0"
    if onu_num_match:
        t_total = onu_num_match.group(2) if onu_num_match.group(2) else onu_num_match.group(1)
    else:
        t_total = str(t_found)
    
    return {'onus': onus, 'total': f"{t_found}/{t_total}"}

def check_port(device, port: str, prompt_pattern: str):
    cmd = f"show gpon onu state gpon-olt_{port}"
    try:
        output = device.send_command(cmd, expect_string=prompt_pattern, read_timeout=45)
        if ":" in output or "ONU Number" in output:
            data = parse_onu_state(output)
            return {'port': port, 'onus': data['onus'], 'total': data['total']}
    except Exception as e:
        print(f"[DEBUG] Erro ao ler porta {port} na OLT {device.host}: {str(e)}", flush=True)

    return None

def scan_single_olt(olt_id, univ_user, univ_pass, app, all_results):
    with app.app_context():
        olt = OLT.query.with_entities(OLT.id, OLT.name, OLT.ip, OLT.username, OLT.password).filter_by(id=olt_id).first()
        if not olt: return
        
        user = olt.username if olt.username else univ_user
        pwd = olt.password if olt.password else univ_pass
        if not user or not pwd:
            return

        print(f"[MONITOR] Iniciando Scan OLT {olt.name} ({olt.ip})...", flush=True)
        device_params = {
            'device_type': 'zte_zxros_telnet',
            'host': olt.ip,
            'username': user,
            'password': pwd,
            'global_delay_factor': 2.0, # Aumentado significativamente para estabilidade em OLTs lentas
            'conn_timeout': 60, # Dobrado o tempo de espera inicial
            'fast_cli': False,
            'read_timeout_override': 120, # Força timeout longo em todas as operações
        }

        try:
            olt_results = []
            with ConnectHandler(**device_params) as device:
                # Força o modo enable manualmente se find_prompt() falhar
                try:
                    device.write_channel('\n')
                    time.sleep(2)
                    device.enable() 
                except:
                    pass
                
                # Regex mais abrangente para capturar prompts com caracteres estranhos ou escapes
                active_pattern = r'[>#\\]' 
                
                device.send_command('terminal length 0', expect_string=active_pattern, read_timeout=60)
                
                # Comando principal com timeout estendido para 300s (5 minutos) para a PJ14
                sh_onu = device.send_command('show gpon onu state', expect_string=active_pattern, read_timeout=300)
                
                found_ports = re.findall(r'(?:gpon-olt_)?(\d+/\d+/\d+)', sh_onu)
                unique_ports = sorted(list(set(found_ports))) or []
                print(f"[DEBUG] OLT {olt.ip} - Portas detectadas: {len(unique_ports)}", flush=True)

                for port in unique_ports:
                    res = check_port(device, port, active_pattern)
                    if res:
                        olt_results.append(res)
            
            db.session.remove()
            
            with threading.Lock():
                all_results[olt.ip] = sorted(olt_results, key=lambda x: x['port'])
            
            total_onus = sum(len(r['onus']) for r in olt_results)
            print(f"[MONITOR] OLT {olt.ip} finalizada com sucesso. Portas: {len(olt_results)}, ONUs: {total_onus}", flush=True)
        except Exception as e:
            print(f"[MONITOR] Erro OLT {olt.ip}: {str(e)}", flush=True)

def monitor_olts_task(app, socketio_instance):
    with app.app_context():
        print("[MONITOR] Iniciando monitoramento MULTITHREAD...", flush=True)
        
        while True:
            try:
                start_time = time.time()
                olts = OLT.query.all()
                all_results = {}

                u_user_cfg = SystemConfig.query.filter_by(key='universal_username').first()
                u_pass_cfg = SystemConfig.query.filter_by(key='universal_password').first()
                u_user = u_user_cfg.value if u_user_cfg else None
                u_pass = u_pass_cfg.value if u_pass_cfg else None

                threads = []
                for olt in olts:
                    t = threading.Thread(target=scan_single_olt, args=(olt.id, u_user, u_pass, app, all_results))
                    t.start()
                    threads.append(t)
                
                for t in threads:
                    t.join(timeout=600)

                final_data = {
                    'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'data': all_results
                }

                latest_status = OLTMonitorData.query.first()
                if not latest_status:
                    latest_status = OLTMonitorData(data=all_results)
                    db.session.add(latest_status)
                else:
                    latest_status.data = all_results
                    latest_status.updated_at = datetime.utcnow()
                
                db.session.commit()
                socketio_instance.emit('olt_update', final_data)
                print(f"[MONITOR] Ciclo finalizado em {int(time.time() - start_time)}s.", flush=True)

            except Exception as e:
                db.session.rollback()
                print(f"[MONITOR] Erro critico: {str(e)}", flush=True)
            time.sleep(120)

def start_monitor(app, socketio_instance):
    print("[MONITOR] Criando thread de monitoramento...")
    thread = threading.Thread(target=monitor_olts_task, args=(app, socketio_instance), daemon=True)
    thread.start()
    print("[MONITOR] Thread disparada com sucesso.")
