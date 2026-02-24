import sqlite3
import bcrypt

def adicionar_usuarios(usuarios):
    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()

    for username, senha in usuarios.items():
        cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
        user_exists = cursor.fetchone()

        if not user_exists:
            hashed_password = bcrypt.hashpw(senha.encode(), bcrypt.gensalt())

            cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
            print(f"Usuário '{username}' adicionado com sucesso!")
        else:
            print(f"Usuário '{username}' já existe!")

    conn.commit()
    conn.close()


usuarios_para_adicionar = {
	"gilvan.oliveira": "mudar@123",
	"atila.lopes": "mudar@123",
	"felipe.souza": "mudar@123",
	"juan.marins": "mudar@123",
	"felipe.calado": "mudar@123",
	"amauri.oliveira": "mudar@123",
	"braian.silva": "mudar@123",
	"diogo.santos": "mudar@123",
	"isaias.cordeiro": "mudar@123",
	"luan.santos": "mudar@123",
    "lucas.correia": "mudar@123",
	"bruno.cardoso": "mudar@123",
	"bruno.silva": "mudar@123"

}
adicionar_usuarios(usuarios_para_adicionar)
