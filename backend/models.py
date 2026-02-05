from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict

@dataclass
class User:
    telegram_id: int
    username: str
    first_name: str
    photo_url: Optional[str]
    timezone: str
    language: str  # 'uk' or 'en'
    created_at: datetime

@dataclass
class ChecklistItem:
    id: str
    text: str
    is_completed: bool
    completed_by: List[int]  # telegram_ids

@dataclass
class Task:
    id: str
    title: str
    description: Optional[str]
    event_date: datetime
    preparation_date: datetime
    photos: List[str]  # URLs to uploaded photos
    checklist: List[Dict]  # ChecklistItems
    created_by: int  # telegram_id
    created_by_username: str
    created_at: datetime
    
    # Статусы
    is_deleted: bool = False
    is_preparation_completed: bool = False
    
    # Уведомления
    notified_week_before: bool = False
    notified_day_before: bool = False
    
    # Кто готов к событию
    ready_users: List[int] = field(default_factory=list)  # telegram_ids
    not_going_users: List[int] = field(default_factory=list)  # telegram_ids