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
            u, p = get_credentials(host)
            if not username: username = u
            if not password: password = p
        except: 
            pass 

    if not username or not password:
        print(f"[{host}] Missing credentials (username or password).")
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=5)
        
        idx, match, data = tn.expect([b"[Ll]ogin:", b"[Uu]sername:", b"[Uu]ser:"], timeout=5)
        
        if idx == -1:
            print(f"[{host}] Login prompt not found (timeout). Data: {data}")
            tn.close()
            return None

        tn.write(username.encode('ascii') + b"\n")

        idx, match, data = tn.expect([b"[Pp]assword:"], timeout=5)
        if idx == -1:
            print(f"[{host}] Password prompt not found. Data: {data}")
            tn.close()
            return None

        tn.write(password.encode('ascii') + b"\n")

        idx, match, data = tn.expect([b">", b"#"], timeout=5)
        if idx == -1:
            print(f"[{host}] Shell prompt not found after login. Data: {data}")
            tn.close()
            return None
        
        current_prompt = match.group(0).decode('ascii')
        prompt_char = current_prompt.strip()[-1]

        if prompt_char == '>':
             tn.write(b"enable\n")
             tn.read_until(b"#", timeout=3)
        
        tn.write(b"terminal length 0\n")
        tn.read_until(b"#", timeout=2)
        
        results = []

        for cmd in commands:
            tn.write(cmd.encode('ascii') + b"\n")
            raw_bytes = tn.read_until(b"#", timeout=10) 
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
             u, p = get_credentials(host)
             if not username: username = u
             if not password: password = p
        except: 
             pass
    
    if not username or not password:
        return None

    try:
        tn = telnetlib.Telnet(host, 23, timeout=5)
        
        idx, match, initial_output = tn.expect([b"[Ll]ogin:", b"[Uu]sername:", b"[Uu]ser:"], timeout=5)
        if idx == -1:
            tn.close()
            return None

        tn.write(username.encode('ascii') + b"\n")
        
        idx, match, data = tn.expect([b"[Pp]assword:"], timeout=5)
        if idx == -1:
             tn.close()
             return None
        
        tn.write(password.encode('ascii') + b"\n")
        
        idx, match, data = tn.expect([b">", b"#"], timeout=5)
        if idx == -1:
             tn.close()
             return None
             
        current_prompt = match.group(0).decode('ascii').strip()
        if current_prompt.endswith('>'):
             tn.write(b"enable\n")
             tn.read_until(b"#", timeout=3)

        tn.write(b"terminal length 0\n")
        tn.read_until(b"#", timeout=2)

        cmd = f"show gpon onu by sn {sn_onu}"
        tn.write(cmd.encode('ascii') + b"\n")
        
        raw_bytes = tn.read_until(b"#", timeout=10) 
        output = raw_bytes.decode('ascii', errors='ignore')
        
        tn.write(b"exit\n")
        tn.close()
        
        if "gpon-onu_" in output:
             return output
             
        return None

    except Exception as e:
        print(f"Error searching ONU on {host}: {e}")
        return None
