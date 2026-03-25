from netmiko import ConnectHandler, NetmikoTimeoutException, NetmikoAuthenticationException
import re
import json
import time
from typing import List, Dict

def parse_onu_state(output: str) -> Dict:
    lines = output.strip().split('\n')
    onus = []
    
    if len(lines) < 2 or '%Code' in output or '%Error' in output:
        return {'onus': [], 'total': '0/0'}
    
    for line in lines:
        line = line.strip()
        if not line or ':' not in line:
            continue
            
        match = re.search(r'(\d+/\d+/\d+:\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)', line)
        if match:
            onu_id, admin, omcc, phase, channel = match.groups()
            onus.append({
                'onu_id': onu_id,
                'admin_state': admin,
                'omcc_state': omcc,
                'phase_state': phase,
                'channel': channel
            })
    
    onu_num_match = re.search(r'ONU Number:\s*(\d+/\d+)', output)
    total_onus = onu_num_match.group(1) if onu_num_match else '0/0'
    
    return {'onus': onus, 'total': total_onus}

def check_port(device, port: str) -> Dict:
    """Verifica uma porta específica testando variações de comando."""
    cmds = [
        f"show gpon onu state gpon_olt-{port}",
        f"show gpon onu state {port}",
        f"show gpon onu state gpon-olt_{port}"
    ]
    
    for cmd in cmds:
        try:
            output = device.send_command(cmd, delay_factor=1)
            if "%Error 20202" not in output and "Invalid input" not in output:
                if "OnuIndex" in output or "ONU Number" in output:
                    data = parse_onu_state(output)
                    if data['onus']:
                        return {'port': port, 'data': data}
                    return None
        except Exception:
            continue
    return None

def discover_gpon_ports(olt_host: str, username: str, password: str) -> List[Dict]:
    """Descobre todas portas GPON e filtra as com ONUs."""
    olt = {
        'device_type': 'zte_zxros', 
        'host': olt_host,
        'username': username,
        'password': password,
        'global_delay_factor': 1,
        'conn_timeout': 30,
    }
    
    try:
        results = []
        with ConnectHandler(**olt) as device:
            device.send_command('terminal length 0')
            
            # Detecta slots e cards disponíveis baseado no show interface brief
            sh_int = device.send_command('show interface brief')
            found_patterns = re.findall(r'(\d+/\d+)/\d+', sh_int)
            unique_racks_shelfs = sorted(list(set(found_patterns)))
            
            ports_to_check = []
            if unique_racks_shelfs:
                for rs in unique_racks_shelfs:
                    for pon in range(1, 17):
                        ports_to_check.append(f"{rs}/{pon}")
            else:
                # Fallback se não detectar rack/shelf
                for card in [1, 2]:
                    for pon in range(1, 17):
                        ports_to_check.append(f"1/{card}/{pon}")
            
            for port in ports_to_check:
                res = check_port(device, port)
                if res:
                    results.append(res)
            
            return sorted(results, key=lambda x: x['port'])
    
    except Exception as e:
        print(f"Erro na conexão: {e}")
        return []

if __name__ == "__main__":
    IP_OLT = "172.16.200.38" 
    USER = "netflex"
    PASS = "N3tfl3x@"
    
    conhecidas = []
    print("\n--- INICIANDO MONITORAMENTO CONTÍNUO (Loop 30s) ---")
    
    while True:
        start_time = time.time()
        print(f"\n[{time.strftime('%H:%M:%S')}] Iniciando atualização de status...")
        
        results = discover_gpon_ports(IP_OLT, USER, PASS)
        
        if results:
            # Salva o arquivo JSON
            with open('resultado_onus.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            # Notifica novas portas no terminal
            atuais = [r['port'] for r in results]
            novas = [p for p in atuais if p not in conhecidas]
            if novas and conhecidas:
                print(f"  [!] ALERTA: Novas portas com ONUs detectadas: {novas}")
            conhecidas = atuais
            
            print(f"  [OK] Status das ONUs atualizado em 'resultado_onus.json'. Total de portas: {len(results)}")
        else:
            print("  [!] Nenhuma ONU encontrada no momento.")

        elapsed = time.time() - start_time
        # Mantém o ciclo de 30 segundos, descontando o tempo da varredura
        wait = max(5, 30 - elapsed) # Espera no mínimo 5s se a varredura for muito demorada
        
        print(f"Próxima atualização em {int(wait)} segundos...")
        time.sleep(wait)
