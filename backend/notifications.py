import requests
from typing import List, Dict

class TelegramNotifier:
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
    
    def send_notification(self, chat_id: int, message: str, buttons=None):
        """Отправить уведомление с кнопками"""
        url = f"{self.base_url}/sendMessage"
        
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        if buttons:
            data['reply_markup'] = {
                'inline_keyboard': buttons
            }
        
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"Error sending notification: {e}")
            return None
    
    def send_task_notification(self, users: List[Dict], task: dict, notification_type: str, language='uk'):
        """Отправить уведомление о задаче всем пользователям"""
        
        if language == 'uk':
            if notification_type == 'week_before':
                emoji = "📅"
                title = "Нагадування: через тиждень подія!"
            else:  # day_before
                emoji = "⏰"
                title = "Нагадування: завтра подія!"
            
            message = f"{emoji} <b>{title}</b>\n\n"
            message += f"📝 <b>{task['title']}</b>\n"
            message += f"👤 Створив: @{task['created_by_username']}"
        else:  # en
            if notification_type == 'week_before':
                emoji = "📅"
                title = "Reminder: event in a week!"
            else:
                emoji = "⏰"
                title = "Reminder: event tomorrow!"
            
            message = f"{emoji} <b>{title}</b>\n\n"
            message += f"📝 <b>{task['title']}</b>\n"
            message += f"👤 Created by: @{task['created_by_username']}"
        
        # Кнопки
        buttons = [[
            {'text': '✅ Готовий' if language == 'uk' else '✅ Ready', 
             'callback_data': f"ready_{task['id']}"},
            {'text': '❌ Не йду' if language == 'uk' else '❌ Not going', 
             'callback_data': f"notgoing_{task['id']}"},
            {'text': '🔗 Відкрити' if language == 'uk' else '🔗 Open', 
             'url': f"https://t.me/YOUR_BOT_USERNAME/YOUR_APP_NAME?startapp=task_{task['id']}"}
        ]]
        
        # Отправляем каждому пользователю на его языке
        for user in users:
            user_lang = user.get('language', 'uk')
            if user_lang != language:
                # Переводим сообщение для этого пользователя
                continue  # Упрощённо - отправляем как есть
            
            self.send_notification(user['telegram_id'], message, buttons)