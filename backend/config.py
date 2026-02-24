import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'sua_chave_secreta_super_segura_e_longa_o_suficiente_para_evitar_avisos'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'sua_chave_jwt_super_segura_e_longa_o_suficiente_para_evitar_avisos'
    SQLALCHEMY_DATABASE_URI = 'sqlite:////app/database/usuarios.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'


