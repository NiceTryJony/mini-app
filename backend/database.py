import json
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import shutil
from pathlib import Path

class Database:
    def __init__(self, db_file='data.json', photos_dir='photos'):
        self.db_file = db_file
        self.photos_dir = photos_dir
        Path(photos_dir).mkdir(exist_ok=True)
        self.data = self._load()
        self._cleanup_old_tasks()
    
    def _load(self):
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            'users': {},
            'tasks': {},
            'deleted_tasks': {},
            'completed_tasks': []
        }
    
    def _save(self):
        with open(self.db_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2, default=str)
    
    def _cleanup_old_tasks(self):
        """Удаляет задачи старше месяца из архива"""
        now = datetime.now()
        one_month_ago = now - timedelta(days=30)
        
        # Очистка удалённых
        to_remove = []
        for task_id, task in self.data['deleted_tasks'].items():
            deleted_at = datetime.fromisoformat(task.get('deleted_at', task['created_at']))
            if deleted_at < one_month_ago:
                to_remove.append(task_id)
        
        for task_id in to_remove:
            # Удаляем фото
            for photo in self.data['deleted_tasks'][task_id].get('photos', []):
                photo_path = os.path.join(self.photos_dir, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
            del self.data['deleted_tasks'][task_id]
        
        # Очистка завершённых (оставляем только последние 10)
        self.data['completed_tasks'].sort(
            key=lambda x: x.get('completed_at', x['created_at']), 
            reverse=True
        )
        
        # Удаляем фото из старых завершённых задач
        for old_task in self.data['completed_tasks'][10:]:
            for photo in old_task.get('photos', []):
                photo_path = os.path.join(self.photos_dir, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
        
        self.data['completed_tasks'] = self.data['completed_tasks'][:10]
        
        if to_remove or len(self.data['completed_tasks']) > 10:
            self._save()
    
    # === USERS ===
    def add_user(self, user_data: dict):
        user_key = str(user_data['telegram_id'])
        if user_key not in self.data['users']:
            self.data['users'][user_key] = {
                'telegram_id': user_data['telegram_id'],
                'username': user_data['username'],
                'first_name': user_data['first_name'],
                'photo_url': user_data.get('photo_url'),
                'timezone': user_data.get('timezone', 'Europe/Kiev'),
                'language': user_data.get('language', 'uk'),
                'created_at': datetime.now().isoformat()
            }
            self._save()
        return self.data['users'][user_key]
    
    def get_user(self, telegram_id: int):
        return self.data['users'].get(str(telegram_id))
    
    def update_user(self, telegram_id: int, updates: dict):
        user_key = str(telegram_id)
        if user_key in self.data['users']:
            self.data['users'][user_key].update(updates)
            self._save()
            return self.data['users'][user_key]
        return None
    
    def get_all_users(self):
        return list(self.data['users'].values())
    
    # === TASKS ===
    def add_task(self, task_data: dict) -> dict:
        import uuid
        task_id = str(uuid.uuid4())
        
        task = {
            'id': task_id,
            'title': task_data['title'],
            'description': task_data.get('description', ''),
            'event_date': task_data['event_date'],
            'preparation_date': task_data['preparation_date'],
            'photos': task_data.get('photos', []),
            'checklist': task_data.get('checklist', []),
            'created_by': task_data['created_by'],
            'created_by_username': task_data['created_by_username'],
            'created_at': datetime.now().isoformat(),
            'is_deleted': False,
            'is_preparation_completed': False,
            'notified_week_before': False,
            'notified_day_before': False,
            'ready_users': [],
            'not_going_users': []
        }
        
        self.data['tasks'][task_id] = task
        self._save()
        return task
    
    def get_tasks(self, include_deleted=False) -> List[dict]:
        """Получить активные задачи, отсортированные по дате события"""
        if include_deleted:
            tasks = list(self.data['tasks'].values())
        else:
            tasks = [t for t in self.data['tasks'].values() if not t['is_deleted']]
        
        tasks.sort(key=lambda x: x['event_date'])
        return tasks
    
    def get_task(self, task_id: str) -> Optional[dict]:
        return self.data['tasks'].get(task_id)
    
    def update_task(self, task_id: str, updates: dict) -> Optional[dict]:
        if task_id in self.data['tasks']:
            self.data['tasks'][task_id].update(updates)
            self._save()
            return self.data['tasks'][task_id]
        return None
    
    def delete_task(self, task_id: str) -> bool:
        """Мягкое удаление - переносит в deleted_tasks"""
        if task_id in self.data['tasks']:
            task = self.data['tasks'][task_id]
            task['deleted_at'] = datetime.now().isoformat()
            self.data['deleted_tasks'][task_id] = task
            del self.data['tasks'][task_id]
            self._save()
            return True
        return False
    
    def restore_task(self, task_id: str) -> Optional[dict]:
        """Восстановление из удалённых"""
        if task_id in self.data['deleted_tasks']:
            task = self.data['deleted_tasks'][task_id]
            task.pop('deleted_at', None)
            task['is_deleted'] = False
            self.data['tasks'][task_id] = task
            del self.data['deleted_tasks'][task_id]
            self._save()
            return task
        return None
    
    def complete_task(self, task_id: str) -> Optional[dict]:
        """Завершить задачу - переносит в completed_tasks"""
        if task_id in self.data['tasks']:
            task = self.data['tasks'][task_id]
            task['completed_at'] = datetime.now().isoformat()
            task['is_preparation_completed'] = True
            
            # Добавляем в начало списка завершённых
            self.data['completed_tasks'].insert(0, task)
            
            # Оставляем только последние 10
            self.data['completed_tasks'] = self.data['completed_tasks'][:10]
            
            del self.data['tasks'][task_id]
            self._save()
            return task
        return None
    
    def restore_completed_task(self, task_id: str) -> Optional[dict]:
        """Восстановление из завершённых"""
        for i, task in enumerate(self.data['completed_tasks']):
            if task['id'] == task_id:
                task.pop('completed_at', None)
                task['is_preparation_completed'] = False
                self.data['tasks'][task_id] = task
                del self.data['completed_tasks'][i]
                self._save()
                return task
        return None
    
    def get_deleted_tasks(self) -> List[dict]:
        """Получить удалённые задачи"""
        tasks = list(self.data['deleted_tasks'].values())
        tasks.sort(key=lambda x: x.get('deleted_at', x['created_at']), reverse=True)
        return tasks
    
    def get_completed_tasks(self) -> List[dict]:
        """Получить завершённые задачи (последние 10)"""
        return self.data['completed_tasks']
    
    def get_tasks_for_notification(self) -> List[dict]:
        """Получить задачи, требующие уведомления"""
        from pytz import timezone as pytz_timezone
        now = datetime.now(pytz_timezone('Europe/Kiev'))
        tasks_to_notify = []
        
        for task in self.data['tasks'].values():
            if task['is_deleted']:
                continue
            
            event_date = datetime.fromisoformat(task['event_date'])
            if event_date.tzinfo is None:
                event_date = pytz_timezone('Europe/Kiev').localize(event_date)
            
            # За неделю до события
            week_before = event_date - timedelta(days=7)
            if not task['notified_week_before'] and now >= week_before:
                tasks_to_notify.append({
                    **task,
                    'notification_type': 'week_before'
                })
            
            # За день до события
            day_before = event_date - timedelta(days=1)
            if not task['notified_day_before'] and now >= day_before:
                tasks_to_notify.append({
                    **task,
                    'notification_type': 'day_before'
                })
        
        return tasks_to_notify
    
    def save_photo(self, photo_file, filename: str) -> str:
        """Сохранить фото и вернуть URL"""
        import uuid
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(self.photos_dir, unique_filename)
        
        photo_file.save(filepath)
        
        return f"/photos/{unique_filename}"