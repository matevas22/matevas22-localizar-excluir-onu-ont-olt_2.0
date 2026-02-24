from .database import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False) 
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': 'admin' if self.username == 'admin' else 'tech'
        }

class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column('usuario', db.String(80), nullable=False)
    action = db.Column('message', db.String(255), nullable=False)
    ip_address = db.Column(db.String(50), nullable=True)  
    system_info = db.Column(db.String(255), nullable=True) 
    details = db.Column(db.String(500), nullable=True)     

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'username': self.username,
            'action': self.action,
            'ip': self.ip_address,
            'system': self.system_info,
            'details': self.details
        }

class OLT(db.Model):
    __tablename__ = 'olts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip = db.Column(db.String(50), unique=True, nullable=False)
    username = db.Column(db.String(50), nullable=True) 
    password = db.Column(db.String(255), nullable=True) 
    type = db.Column(db.String(50), default="ZTE")
    actions = db.Column(db.String(255), default="view,edit,delete")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'ip': self.ip,
            'username': self.username,
            'password': self.password,
            'type': self.type,
            'actions': self.actions.split(',')
        }

class StatusDescription(db.Model):
    __tablename__ = 'status_descriptions'
    id = db.Column(db.Integer, primary_key=True)
    status_code = db.Column(db.String(50), unique=True, nullable=False) 
    description = db.Column(db.String(255), nullable=False) 
    color = db.Column(db.String(20), default="gray") 

    def to_dict(self):
        return {
            'id': self.id,
            'status_code': self.status_code,
            'description': self.description,
            'color': self.color
        }

class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value
        }

