// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();

// URL вашего бэкенда на Render (замените после деплоя)
const API_URL = 'https://your-app-name.onrender.com';

// Получаем данные пользователя из Telegram
const user = tg.initDataUnsafe.user;

if (user) {
    document.getElementById('user-info').textContent = 
        `Привет, ${user.first_name || 'пользователь'}!`;
}

// Обработчик кнопки
document.getElementById('sendBtn').addEventListener('click', async () => {
    const responseDiv = document.getElementById('response');
    responseDiv.textContent = 'Загрузка...';
    
    try {
        const response = await fetch(`${API_URL}/api/hello`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: user?.first_name || 'Guest'
            })
        });
        
        const data = await response.json();
        responseDiv.textContent = `Ответ: ${data.message}`;
        
        // Показываем уведомление в Telegram
        tg.showAlert(data.message);
        
    } catch (error) {
        responseDiv.textContent = `Ошибка: ${error.message}`;
    }
});

// Готовность приложения
tg.ready();