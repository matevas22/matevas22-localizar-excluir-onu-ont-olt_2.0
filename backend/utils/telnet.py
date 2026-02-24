import telnetlib
import time
from ..models import OLT, SystemConfig

def get_credentials(host_ip):
    try:
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
    except Exception:
        return "admin", "admin" 

def send_command(host, commands, username=None, password=None):
    if not username or not password:
        try:
            username, password = get_credentials(host)
        except: 
            pass 
    
    uname = username
    pwd = password

    if not uname or not pwd:
        print(f"[{host}] Missing credentials (username or password).")
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=3)
        
        idx, match, initial_output = tn.expect([b"Login:", b"Username:", b"User:"], timeout=3)
        
        if idx == -1:
            print(f"[{host}] Login prompt not found (timeout).")
            tn.close()
            return None

        tn.write(uname.encode('ascii') + b"\n")

        tn.read_until(b"Password: ", timeout=3)
        tn.write(pwd.encode('ascii') + b"\n")

        res = tn.read_until(b"#", timeout=3)
        
        tn.write(b"terminal-length 0\n") 
        tn.read_until(b"#", timeout=2)
        tn.write(b"terminal length 0\n")
        tn.read_until(b"#", timeout=1)
        tn.write(b"idle-timeout 0\n")
        tn.read_until(b"#", timeout=1)
        
        results = []

        for cmd in commands:
            tn.write(cmd.encode('ascii') + b"\n")
            raw_bytes = tn.read_until(b"#", timeout=5)
            out = raw_bytes.decode('ascii', errors='ignore')
            results.append(out)
        
        tn.write(b"exit\n")
        tn.close()
        return results

    except Exception as e:
        print(f"Error connecting to {host}: {e}")
        return None

def search_onu_on_olt(host, sn_onu, username=None, password=None):
    if not username or not password:
        try:
            username, password = get_credentials(host)
        except: pass
    
    uname = username
    pwd = password
    
    if not uname or not pwd:
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=3)
        
        idx, match, initial_output = tn.expect([b"Login:", b"Username:", b"User:"], timeout=3)
        if idx == -1:
            tn.close()
            return None

        tn.write(uname.encode('ascii') + b"\n")
        
        tn.read_until(b"Password: ", timeout=3)
        tn.write(pwd.encode('ascii') + b"\n")
        
        login_res = tn.read_until(b"#", timeout=3)
        if b"#" not in login_res:
             tn.close()
             return None

        tn.write(b"terminal-length 0\n")
        tn.read_until(b"#", timeout=1)

        cmd = f"show gpon onu by sn {sn_onu}"
        tn.write(cmd.encode('ascii') + b"\n")
        
        raw_bytes = tn.read_until(b"#", timeout=4)
        output = raw_bytes.decode('ascii', errors='ignore')
        
        tn.write(b"exit\n")
        tn.close()
        
        if "gpon-onu_" in output:
             return output
             
        return None

    except Exception as e:
        return None
