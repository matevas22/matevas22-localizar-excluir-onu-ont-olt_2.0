import telnetlib
import time
from ..models import OLT, SystemConfig

def get_credentials(host_ip):
    olt = OLT.query.filter_by(ip=host_ip).first()
    uname = olt.username if olt and olt.username else None
    pwd = olt.password if olt and olt.password else None
    
    if not uname:
        cfg = SystemConfig.query.filter_by(key='universal_username').first()
        uname = cfg.value if cfg else None
    
    if not pwd:
        cfg = SystemConfig.query.filter_by(key='universal_password').first()
        pwd = cfg.value if cfg else None
        
    return uname, pwd

def send_command(host, commands, username=None, password=None):
    if not username or not password:
        username, password = get_credentials(host)
    
    uname = username
    pwd = password

    if not uname or not pwd:
        print(f"[{host}] Missing credentials (username or password).")
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=10)
        idx, match, initial_output = tn.expect([b"Login:", b"Username:", b"User:"], timeout=10)
        
        if idx == -1:
            print(f"[{host}] Login prompt not found (timeout). Output so far: {initial_output}")
            tn.close()
            return None

        tn.write(uname.encode('ascii') + b"\n")

        tn.read_until(b"Password: ", timeout=10)
        tn.write(pwd.encode('ascii') + b"\n")

        tn.read_until(b"#", timeout=5)
        
        tn.write(b"terminal-length 0\n")
        tn.read_until(b"#", timeout=2)
        tn.write(b"terminal length 0\n")
        tn.read_until(b"#", timeout=2)
        tn.write(b"idle-timeout 0\n")
        tn.read_until(b"#", timeout=2)
        
        output_log = []

        for cmd in commands:
            print(f"[{host}] Executing: {cmd}")
            tn.write(cmd.encode('ascii') + b"\n")
            raw_bytes = tn.read_until(b"#", timeout=15)
            out = raw_bytes.decode('ascii', errors='ignore')
            print(f"[{host}] RAW OUTPUT LEN: {len(out)}")
            print(f"[{host}] RAW OUTPUT START: {out[:100]}")
            output_log.append(out)
        
        tn.write(b"exit\n")
        tn.close()
        return output_log

    except Exception as e:
        print(f"Error connecting to {host}: {e}")
        return None

def search_onu_on_olt(host, sn_onu, username=None, password=None):
    if not username or not password:
        username, password = get_credentials(host)
    
    uname = username
    pwd = password
    
    if not uname or not pwd:
        print(f"[{host}] Missing credentials (username or password).")
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=10)
        
        idx, match, initial_output = tn.expect([b"Login:", b"Username:", b"User:"], timeout=10)
        if idx == -1:
            print(f"[{host}] Login prompt not found (timeout). Output: {initial_output}")
            tn.close()
            return None

        tn.write(uname.encode('ascii') + b"\n")
        
        tn.read_until(b"Password: ", timeout=10)
        tn.write(pwd.encode('ascii') + b"\n")
        
        login_res = tn.read_until(b"#", timeout=5)
        if b"#" not in login_res:
            print(f"[{host}] Login failed or prompt not found")
            tn.close()
            return None

        command = f"show gpon onu by sn {sn_onu}\n"
        print(f"[{host}] Sending: {command.strip()}")
        tn.write(command.encode('ascii'))
        
        output = tn.read_until(b"#", timeout=10).decode('ascii', errors='ignore')
        
        tn.write(b"exit\n")
        tn.close()
        
        print(f"[{host}] Result len: {len(output)}")
        
        if "gpon-onu" in output or "gpon-olt" in output:
            return output
            
        return None
    except Exception as e:
        print(f"[{host}] Connection error: {e}")
        return None
