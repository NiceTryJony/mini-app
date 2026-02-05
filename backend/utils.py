from datetime import datetime
import pytz

def get_task_status(task: dict) -> str:
    """
    Определить статус задачи по датам
    Возвращает: 'future', 'preparation', 'preparation_completed', 'urgent'
    """
    now = datetime.now(pytz.timezone('Europe/Kiev'))
    
    prep_date = datetime.fromisoformat(task['preparation_date'])
    event_date = datetime.fromisoformat(task['event_date'])
    
    if prep_date.tzinfo is None:
        prep_date = pytz.timezone('Europe/Kiev').localize(prep_date)
    if event_date.tzinfo is None:
        event_date = pytz.timezone('Europe/Kiev').localize(event_date)
    
    # Завершена подготовка
    if task.get('is_preparation_completed'):
        return 'preparation_completed'
    
    # Событие уже началось или очень скоро
    if now >= event_date:
        return 'urgent'
    
    # Время подготовки наступило
    if now >= prep_date:
        return 'preparation'
    
    # Будущая задача
    return 'future'

def format_datetime_for_timezone(dt_str: str, timezone_str: str, language='uk') -> str:
    """Форматировать дату/время для определённого часового пояса"""
    dt = datetime.fromisoformat(dt_str)
    tz = pytz.timezone(timezone_str)
    
    if dt.tzinfo is None:
        dt = pytz.timezone('Europe/Kiev').localize(dt)
    
    dt_local = dt.astimezone(tz)
    
    if language == 'uk':
        return dt_local.strftime('%d.%m.%Y %H:%M')
    else:
        return dt_local.strftime('%m/%d/%Y %I:%M %p')