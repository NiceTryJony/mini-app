from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from database import Database
from notifications import TelegramNotifier
from utils import get_task_status

load_dotenv()

app = Flask(__name__)
CORS(app)

# Конфигурация
UPLOAD_FOLDER = 'photos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Инициализация
db = Database()
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
notifier = TelegramNotifier(BOT_TOKEN) if BOT_TOKEN else None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Планировщик для уведомлений
scheduler = BackgroundScheduler()

def check_notifications():
    """Проверяет задачи и отправляет уведомления"""
    if not notifier:
        return
    
    tasks_to_notify = db.get_tasks_for_notification()
    users = db.get_all_users()
    
    for task in tasks_to_notify:
        notification_type = task['notification_type']
        
        # Отправляем уведомление
        notifier.send_task_notification(users, task, notification_type)
        
        # Обновляем флаг уведомления
        if notification_type == 'week_before':
            db.update_task(task['id'], {'notified_week_before': True})
        else:
            db.update_task(task['id'], {'notified_day_before': True})

# Запускаем проверку каждые 10 минут
scheduler.add_job(check_notifications, 'interval', minutes=10)
scheduler.start()

# === API ENDPOINTS ===

@app.route('/')
def home():
    return jsonify({"status": "Task Manager API Running", "version": "2.0"})

@app.route('/ping')
def ping():
    return jsonify({"status": "pong", "timestamp": datetime.now().isoformat()})

# === USER ENDPOINTS ===

@app.route('/api/user/register', methods=['POST'])
def register_user():
    data = request.get_json()
    user = db.add_user(data)
    return jsonify(user)

@app.route('/api/user/<int:telegram_id>', methods=['GET'])
def get_user(telegram_id):
    user = db.get_user(telegram_id)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route('/api/user/<int:telegram_id>', methods=['PUT'])
def update_user(telegram_id):
    data = request.get_json()
    user = db.update_user(telegram_id, data)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route('/api/users', methods=['GET'])
def get_all_users():
    users = db.get_all_users()
    return jsonify(users)

# === TASK ENDPOINTS ===

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = db.get_tasks()
    
    # Добавляем статус к каждой задаче
    for task in tasks:
        task['status'] = get_task_status(task)
    
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    
    required = ['title', 'event_date', 'preparation_date', 'created_by', 'created_by_username']
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    task = db.add_task(data)
    task['status'] = get_task_status(task)
    return jsonify(task), 201

@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    task = db.get_task(task_id)
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    task = db.update_task(task_id, data)
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Мягкое удаление"""
    if db.delete_task(task_id):
        return jsonify({"success": True})
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>/restore', methods=['POST'])
def restore_task(task_id):
    """Восстановить из удалённых"""
    task = db.restore_task(task_id)
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>/complete', methods=['POST'])
def complete_preparation(task_id):
    """Отметить подготовку как завершённую"""
    task = db.update_task(task_id, {'is_preparation_completed': True})
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>/uncomplete', methods=['POST'])
def uncomplete_preparation(task_id):
    """Снять отметку о завершении подготовки"""
    task = db.update_task(task_id, {'is_preparation_completed': False})
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>/finish', methods=['POST'])
def finish_task(task_id):
    """Полностью завершить задачу (переместить в завершённые)"""
    task = db.complete_task(task_id)
    if task:
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<task_id>/restore-completed', methods=['POST'])
def restore_completed(task_id):
    """Восстановить из завершённых"""
    task = db.restore_completed_task(task_id)
    if task:
        task['status'] = get_task_status(task)
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

# === READY/NOT GOING ===

@app.route('/api/tasks/<task_id>/ready', methods=['POST'])
def mark_ready(task_id):
    data = request.get_json()
    user_id = data.get('user_id')
    
    task = db.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    ready_users = task.get('ready_users', [])
    not_going_users = task.get('not_going_users', [])
    
    # Убираем из "не иду" если там был
    if user_id in not_going_users:
        not_going_users.remove(user_id)
    
    # Добавляем в "готов"
    if user_id not in ready_users:
        ready_users.append(user_id)
    
    updated_task = db.update_task(task_id, {
        'ready_users': ready_users,
        'not_going_users': not_going_users
    })
    
    return jsonify(updated_task)

@app.route('/api/tasks/<task_id>/not-going', methods=['POST'])
def mark_not_going(task_id):
    data = request.get_json()
    user_id = data.get('user_id')
    
    task = db.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    ready_users = task.get('ready_users', [])
    not_going_users = task.get('not_going_users', [])
    
    # Убираем из "готов" если там был
    if user_id in ready_users:
        ready_users.remove(user_id)
    
    # Добавляем в "не иду"
    if user_id not in not_going_users:
        not_going_users.append(user_id)
    
    updated_task = db.update_task(task_id, {
        'ready_users': ready_users,
        'not_going_users': not_going_users
    })
    
    return jsonify(updated_task)

# === CHECKLIST ===

@app.route('/api/tasks/<task_id>/checklist', methods=['POST'])
def add_checklist_item(task_id):
    data = request.get_json()
    task = db.get_task(task_id)
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    import uuid
    new_item = {
        'id': str(uuid.uuid4()),
        'text': data['text'],
        'is_completed': False,
        'completed_by': []
    }
    
    checklist = task.get('checklist', [])
    checklist.append(new_item)
    
    updated_task = db.update_task(task_id, {'checklist': checklist})
    return jsonify(updated_task)

@app.route('/api/tasks/<task_id>/checklist/<item_id>', methods=['PUT'])
def update_checklist_item(task_id, item_id):
    data = request.get_json()
    task = db.get_task(task_id)
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    checklist = task.get('checklist', [])
    
    for item in checklist:
        if item['id'] == item_id:
            if 'text' in data:
                item['text'] = data['text']
            
            if 'toggle_user' in data:
                user_id = data['toggle_user']
                if user_id in item['completed_by']:
                    item['completed_by'].remove(user_id)
                else:
                    item['completed_by'].append(user_id)
                
                # Обновляем is_completed
                item['is_completed'] = len(item['completed_by']) > 0
            
            break
    
    updated_task = db.update_task(task_id, {'checklist': checklist})
    return jsonify(updated_task)

@app.route('/api/tasks/<task_id>/checklist/<item_id>', methods=['DELETE'])
def delete_checklist_item(task_id, item_id):
    task = db.get_task(task_id)
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    checklist = task.get('checklist', [])
    checklist = [item for item in checklist if item['id'] != item_id]
    
    updated_task = db.update_task(task_id, {'checklist': checklist})
    return jsonify(updated_task)

# === ARCHIVE ===

@app.route('/api/archive/deleted', methods=['GET'])
def get_deleted_tasks():
    tasks = db.get_deleted_tasks()
    return jsonify(tasks)

@app.route('/api/archive/completed', methods=['GET'])
def get_completed_tasks():
    tasks = db.get_completed_tasks()
    return jsonify(tasks)

# === PHOTOS ===

@app.route('/api/tasks/<task_id>/photos', methods=['POST'])
def upload_photo(task_id):
    task = db.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    if 'photo' not in request.files:
        return jsonify({"error": "No photo file"}), 400
    
    file = request.files['photo']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        photo_url = db.save_photo(file, filename)
        
        # Добавляем URL фото к задаче
        photos = task.get('photos', [])
        photos.append(photo_url)
        
        updated_task = db.update_task(task_id, {'photos': photos})
        return jsonify({"photo_url": photo_url, "task": updated_task})
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/photos/<filename>')
def serve_photo(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/tasks/<task_id>/photos/<int:photo_index>', methods=['DELETE'])
def delete_photo(task_id, photo_index):
    task = db.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    photos = task.get('photos', [])
    
    if photo_index >= len(photos):
        return jsonify({"error": "Photo not found"}), 404
    
    # Удаляем файл
    photo_path = photos[photo_index]
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(photo_path))
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Удаляем из списка
    photos.pop(photo_index)
    
    updated_task = db.update_task(task_id, {'photos': photos})
    return jsonify(updated_task)

# === SEARCH ===

@app.route('/api/tasks/search', methods=['GET'])
def search_tasks():
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    tasks = db.get_tasks()
    
    if date_from:
        from_dt = datetime.fromisoformat(date_from)
        tasks = [t for t in tasks if datetime.fromisoformat(t['event_date']) >= from_dt]
    
    if date_to:
        to_dt = datetime.fromisoformat(date_to)
        tasks = [t for t in tasks if datetime.fromisoformat(t['event_date']) <= to_dt]
    
    for task in tasks:
        task['status'] = get_task_status(task)
    
    return jsonify(tasks)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
