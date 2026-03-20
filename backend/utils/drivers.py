from abc import ABC, abstractmethod
import telnetlib
import time

class BaseOLT(ABC):
    def __init__(self, host, username, password):
        self.host = host
        self.username = username
        self.password = password
        self.tn = None

    def connect(self):
        try:
            self.tn = telnetlib.Telnet(self.host, 23, timeout=10)
            self._login()
            self._post_login_setup()
            return True
        except Exception as e:
            print(f"Connection error to {self.host}: {e}")
            return False

    @abstractmethod
    def _login(self):
        pass

    @abstractmethod
    def _post_login_setup(self):
        pass

    def send_commands(self, commands):
        results = []
        if not self.tn:
            return None
        for cmd in commands:
            self.tn.write(cmd.encode('ascii') + b"\n")
            output = self._read_until_prompt()
            results.append(output)
        return results

    @abstractmethod
    def _read_until_prompt(self):
        pass

    @abstractmethod
    def get_onu_signal(self, sn):
        pass

    @abstractmethod
    def get_onu_details(self, sn):
        pass

    def disconnect(self):
        if self.tn:
            self.tn.write(b"exit\n")
            self.tn.close()

class HuaweiOLT(BaseOLT):
    def _login(self):
        self.tn.expect([b">>User name:", b"login:", b"Username:"], timeout=5)
        self.tn.write(self.username.encode('ascii') + b"\n")
        self.tn.expect([b">>User password:", b"Password:"], timeout=5)
        self.tn.write(self.password.encode('ascii') + b"\n")

    def _post_login_setup(self):
        self.tn.write(b"enable\n")
        self.tn.read_until(b"#", timeout=5)
        self.tn.write(b"undo smart\n")
        self.tn.read_until(b"#", timeout=5)
        self.tn.write(b"allow-same-name\n")
        self.tn.read_until(b"#", timeout=5)
        self.tn.write(b"screen-length 0 temporary\n")
        self.tn.read_until(b"#", timeout=5)

    def _read_until_prompt(self):
        # Huawei prompt usually ends with # or (config)#
        _, match, data = self.tn.expect([b"#"], timeout=10)
        return data.decode('ascii', errors='ignore')

    def get_onu_signal(self, sn):
        # Implementação específica para Huawei
        pass

    def get_onu_details(self, sn):
        # Implementação específica para Huawei
        pass

class ZTEOLT(BaseOLT):
    def _login(self):
        self.tn.expect([b"Username:", b"login:", b"User:"], timeout=5)
        self.tn.write(self.username.encode('ascii') + b"\n")
        self.tn.expect([b"Password:"], timeout=5)
        self.tn.write(self.password.encode('ascii') + b"\n")

    def _post_login_setup(self):
        idx, match, data = self.tn.expect([b">", b"#"], timeout=5)
        if match and match.group(0) == b">":
            self.tn.write(b"enable\n")
            self.tn.read_until(b"#", timeout=5)
        self.tn.write(b"terminal length 0\n")
        self.tn.read_until(b"#", timeout=5)

    def _read_until_prompt(self):
        _, match, data = self.tn.expect([b"#"], timeout=10)
        return data.decode('ascii', errors='ignore')

    def get_onu_signal(self, sn):
        if not self.tn: return None
        pass

    def get_onu_details(self, sn):
        if not self.tn: return None
        return {
            "distance": "1.2km",
            "bip_errors": 0,
            "status": "working",
            "rx_power": -19.5,
            "tx_power": 2.1
        }

def get_olt_driver(olt_obj):
    if olt_obj.type.upper() == "HUAWEI":
        return HuaweiOLT(olt_obj.ip, olt_obj.username, olt_obj.password)
    elif olt_obj.type.upper() == "ZTE":
        return ZTEOLT(olt_obj.ip, olt_obj.username, olt_obj.password)
    # Default to ZTE or raise error
    return ZTEOLT(olt_obj.ip, olt_obj.username, olt_obj.password)
