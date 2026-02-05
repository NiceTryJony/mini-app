from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с Vercel

# Простой endpoint для проверки
@app.route('/')
def home():
    return jsonify({"status": "Backend is running!"})

# API для Mini App
@app.route('/api/hello', methods=['POST'])
def hello():
    data = request.get_json()
    user_name = data.get('name', 'Guest')
    return jsonify({
        "message": f"Привет, {user_name}!",
        "timestamp": "2024-02-04"
    })

# Endpoint для поддержания активности (пинги)
@app.route('/ping')
def ping():
    return jsonify({"status": "pong"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)