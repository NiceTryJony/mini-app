const API_URL = 'https://mini-app-2pze.onrender.com';


let tg = window.Telegram.WebApp;
tg.expand();

let currentUser = null;
let currentLang = 'uk';
let allUsers = [];
let currentView = 'tasks'; // 'tasks', 'archive', 'settings'
let currentTasks = [];
let checklistExpanded = false;

// === ИНИЦИАЛИЗАЦИЯ ===

async function init() {
    const user = tg.initDataUnsafe.user;
    
    if (user) {
        // Регистрируем пользователя
        currentUser = await registerUser(user);
        currentLang = currentUser.language || 'uk';
        
        // Загружаем всех пользователей
        allUsers = await loadAllUsers();
        
        updateUI();
    }
    
    // Загружаем задачи
    await loadTasks();
    
    // Обновляем интерфейс
    renderView();
}

async function registerUser(user) {
    try {
        const response = await fetch(`${API_URL}/api/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.id,
                username: user.username || 'user',
                first_name: user.first_name || 'User',
                photo_url: user.photo_url,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: 'uk'
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error registering user:', error);
        return null;
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        return await response.json();
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// === ЗАГРУЗКА ЗАДАЧ ===

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/api/tasks`);
        currentTasks = await response.json();
        renderTasksList();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// === РЕНДЕРИНГ ===

function updateUI() {
    // Обновляем переводы
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        el.textContent = t(key, currentLang);
    });
    
    // Обновляем пользователя
    const userAvatar = document.getElementById('userAvatar');
    if (currentUser) {
        if (currentUser.photo_url) {
            userAvatar.innerHTML = `<img src="${currentUser.photo_url}" alt="${currentUser.first_name}">`;
        } else {
            userAvatar.textContent = currentUser.first_name.charAt(0).toUpperCase();
        }
    }
}

function renderView() {
    // Скрываем все вкладки
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    
    // Показываем активную
    document.getElementById(`${currentView}View`).style.display = 'block';
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-view="${currentView}"]`).classList.add('active');
    
    // Загружаем данные для вкладки
    if (currentView === 'tasks') {
        loadTasks();
    } else if (currentView === 'archive') {
        loadArchive();
    }
}

function switchView(view) {
    currentView = view;
    renderView();
}

// === ЗАДАЧИ ===

function renderTasksList() {
    const container = document.getElementById('tasksContainer');
    
    if (currentTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div>${t('noTasks', currentLang)}</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    currentTasks.forEach(task => {
        container.appendChild(createTaskCard(task));
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;
    
    const eventDate = new Date(task.event_date);
    const prepDate = new Date(task.preparation_date);
    
    // Статус badge
    let statusText = '';
    switch(task.status) {
        case 'future': statusText = t('statusFuture', currentLang); break;
        case 'preparation': statusText = t('statusPreparation', currentLang); break;
        case 'preparation_completed': statusText = t('statusCompleted', currentLang); break;
        case 'urgent': statusText = t('statusUrgent', currentLang); break;
    }
    
    // Готовые пользователи
    const readyUsersHtml = task.ready_users && task.ready_users.length > 0 ? `
        <div class="ready-section">
            <div class="ready-label">${t('readyForEvent', currentLang)}</div>
            <div class="ready-users">
                ${task.ready_users.map(userId => {
                    const user = allUsers.find(u => u.telegram_id === userId);
                    if (!user) return '';
                    return `
                        <div class="ready-user-avatar" title="${user.first_name}">
                            ${user.photo_url 
                                ? `<img src="${user.photo_url}" alt="${user.first_name}">` 
                                : user.first_name.charAt(0).toUpperCase()}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';
    
    // Фото
    const photosHtml = task.photos && task.photos.length > 0 ? `
        <div class="task-photos">
            ${task.photos.map((photo, index) => `
                <img src="${API_URL}${photo}" 
                     class="task-photo" 
                     onclick="viewPhoto('${API_URL}${photo}')"
                     alt="Photo ${index + 1}">
            `).join('')}
        </div>
    ` : '';
    
    // Чеклист
    const checklistHtml = task.checklist && task.checklist.length > 0 ? `
        <div class="checklist-section">
            <div class="checklist-toggle" onclick="toggleChecklistView('${task.id}')">
                <span id="checklist-arrow-${task.id}">▶</span>
                ${t('checklist', currentLang)} (${task.checklist.filter(i => i.is_completed).length}/${task.checklist.length})
            </div>
            <div class="checklist-items" id="checklist-${task.id}" style="display: none;">
                ${task.checklist.map(item => `
                    <div class="checklist-item">
                        <div class="checklist-checkbox ${item.is_completed ? 'checked' : ''}" 
                             onclick="toggleChecklistItem('${task.id}', '${item.id}')"></div>
                        <div class="checklist-text ${item.is_completed ? 'completed' : ''}">${item.text}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Кнопки действий
    const isAuthor = currentUser && task.created_by === currentUser.telegram_id;
    const canEdit = isAuthor;
    
    let actionsHtml = '<div class="task-actions">';
    
    // Готов/Не иду
    const isReady = task.ready_users && task.ready_users.includes(currentUser?.telegram_id);
    const isNotGoing = task.not_going_users && task.not_going_users.includes(currentUser?.telegram_id);
    
    if (!isReady) {
        actionsHtml += `<button class="btn btn-success btn-small" onclick="markReady('${task.id}')">${t('markReady', currentLang)}</button>`;
    }
    if (!isNotGoing) {
        actionsHtml += `<button class="btn btn-danger btn-small" onclick="markNotGoing('${task.id}')">${t('markNotGoing', currentLang)}</button>`;
    }
    
    // Завершить подготовку
    if (task.status === 'preparation' && !task.is_preparation_completed) {
        actionsHtml += `<button class="btn btn-success" onclick="completePreparation('${task.id}')">${t('completePreparation', currentLang)}</button>`;
    } else if (task.is_preparation_completed) {
        actionsHtml += `<button class="btn btn-secondary" onclick="uncompletePreparation('${task.id}')">${t('uncompletePreparation', currentLang)}</button>`;
    }
    
    // Редактировать (только автор)
    if (canEdit) {
        actionsHtml += `<button class="btn btn-primary btn-small" onclick="openEditModal('${task.id}')">${t('edit', currentLang)}</button>`;
    }
    
    // Завершить задачу
    actionsHtml += `<button class="btn btn-success btn-small" onclick="finishTask('${task.id}')">${t('finishTask', currentLang)}</button>`;
    
    // Удалить (только автор)
    if (canEdit) {
        actionsHtml += `<button class="btn btn-danger btn-small" onclick="deleteTask('${task.id}')">${t('delete', currentLang)}</button>`;
    }
    
    actionsHtml += '</div>';
    
    card.innerHTML = `
        <div class="status-badge ${task.status}">${statusText}</div>
        <div class="task-header">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        </div>
        ${readyUsersHtml}
        <div class="task-dates">
            <div class="date-item">
                <div class="date-label">⏰ ${t('preparation', currentLang)}</div>
                <div class="date-value">${formatDate(prepDate)}</div>
            </div>
            <div class="date-item">
                <div class="date-label">🎯 ${t('event', currentLang)}</div>
                <div class="date-value">${formatDate(eventDate)}</div>
            </div>
        </div>
        ${photosHtml}
        ${checklistHtml}
        <div class="task-author">👤 ${t('createdBy', currentLang)}: @${task.created_by_username}</div>
        ${actionsHtml}
    `;
    
    return card;
}

// === МОДАЛЬНЫЕ ОКНА ===

function openCreateModal() {
    checklistExpanded = false;
    document.getElementById('taskForm').reset();
    document.getElementById('taskModalTitle').textContent = t('newTask', currentLang);
    document.getElementById('taskId').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('checklistPreview').innerHTML = '';
    document.getElementById('checklistSection').style.display = 'none';
    document.getElementById('taskModal').classList.add('active');
}

async function openEditModal(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('taskModalTitle').textContent = t('editTask', currentLang);
    document.getElementById('taskId').value = taskId;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskEventDate').value = task.event_date.slice(0, 16);
    document.getElementById('taskPrepDate').value = task.preparation_date.slice(0, 16);
    
    // Фото
    const photoPreview = document.getElementById('photoPreview');
    photoPreview.innerHTML = task.photos.map((photo, index) => `
        <div class="photo-preview-item">
            <img src="${API_URL}${photo}" class="photo-preview-img">
            <button type="button" class="photo-remove-btn" onclick="removePhoto('${taskId}', ${index})">×</button>
        </div>
    `).join('');
    
    // Чеклист
    checklistExpanded = task.checklist && task.checklist.length > 0;
    renderChecklistPreview(task.checklist || []);
    document.getElementById('checklistSection').style.display = checklistExpanded ? 'block' : 'none';
    
    document.getElementById('taskModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function toggleChecklistSection() {
    checklistExpanded = !checklistExpanded;
    document.getElementById('checklistSection').style.display = checklistExpanded ? 'block' : 'none';
    document.getElementById('checklistToggleBtn').textContent = 
        checklistExpanded ? `▼ ${t('hideChecklist', currentLang)}` : `▶ ${t('showChecklist', currentLang)}`;
}

function renderChecklistPreview(items) {
    const preview = document.getElementById('checklistPreview');
    preview.innerHTML = items.map((item, index) => `
        <div class="checklist-item">
            <input type="text" class="checklist-input" value="${item.text}" 
                   onchange="updateChecklistItemText(${index}, this.value)">
            <button type="button" class="btn btn-danger btn-small" 
                    onclick="removeChecklistItem(${index})">×</button>
        </div>
    `).join('');
}

let tempChecklist = [];

function addChecklistItemToForm() {
    const input = document.getElementById('checklistItemInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    const taskId = document.getElementById('taskId').value;
    
    if (taskId) {
        // Редактирование - добавляем сразу на сервер
        addChecklistItemToTask(taskId, text);
    } else {
        // Создание - добавляем временно
        tempChecklist.push({
            id: Date.now().toString(),
            text: text,
            is_completed: false,
            completed_by: []
        });
        renderChecklistPreview(tempChecklist);
    }
    
    input.value = '';
}

function updateChecklistItemText(index, text) {
    tempChecklist[index].text = text;
}

function removeChecklistItem(index) {
    tempChecklist.splice(index, 1);
    renderChecklistPreview(tempChecklist);
}

// === СОЗДАНИЕ/РЕДАКТИРОВАНИЕ ЗАДАЧИ ===

async function saveTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const formData = new FormData(event.target);
    
    const taskData = {
        title: formData.get('title'),
        description: formData.get('description'),
        event_date: new Date(formData.get('event_date')).toISOString(),
        preparation_date: new Date(formData.get('preparation_date')).toISOString(),
        created_by: currentUser.telegram_id,
        created_by_username: currentUser.username
    };
    
    // Чеклист для новой задачи
    if (!taskId) {
        taskData.checklist = tempChecklist;
        tempChecklist = [];
    }
    
    try {
        let response;
        if (taskId) {
            // Редактирование
            response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            // Создание
            response = await fetch(`${API_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }
        
        if (response.ok) {
            closeModal('taskModal');
            await loadTasks();
            tg.showAlert(taskId ? t('taskUpdated', currentLang) : t('taskCreated', currentLang));
        }
    } catch (error) {
        console.error('Error saving task:', error);
        tg.showAlert(t('error', currentLang));
    }
}

// === ФОТО ===

async function uploadPhoto() {
    const taskId = document.getElementById('taskId').value;
    if (!taskId) {
        tg.showAlert('Сначала сохраните задачу');
        return;
    }
    
    const input = document.getElementById('photoInput');
    const file = input.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/photos`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            tg.showAlert(t('photoUploaded', currentLang));
            
            // Обновляем превью
            const preview = document.getElementById('photoPreview');
            const newPhoto = document.createElement('div');
            newPhoto.className = 'photo-preview-item';
            newPhoto.innerHTML = `
                <img src="${API_URL}${data.photo_url}" class="photo-preview-img">
                <button type="button" class="photo-remove-btn" 
                        onclick="removePhoto('${taskId}', ${data.task.photos.length - 1})">×</button>
            `;
            preview.appendChild(newPhoto);
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
    }
    
    input.value = '';
}

async function removePhoto(taskId, photoIndex) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/photos/${photoIndex}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Обновляем превью
            const preview = document.getElementById('photoPreview');
            preview.children[photoIndex].remove();
        }
    } catch (error) {
        console.error('Error removing photo:', error);
    }
}

function viewPhoto(url) {
    const viewer = document.getElementById('photoViewer');
    const img = document.getElementById('viewerImage');
    img.src = url;
    viewer.classList.add('active');
}

function closePhotoViewer() {
    document.getElementById('photoViewer').classList.remove('active');
}

// === ЧЕКЛИСТ В ЗАДАЧЕ ===

function toggleChecklistView(taskId) {
    const container = document.getElementById(`checklist-${taskId}`);
    const arrow = document.getElementById(`checklist-arrow-${taskId}`);
    
    if (container.style.display === 'none') {
        container.style.display = 'flex';
        arrow.textContent = '▼';
    } else {
        container.style.display = 'none';
        arrow.textContent = '▶';
    }
}

async function toggleChecklistItem(taskId, itemId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/checklist/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toggle_user: currentUser.telegram_id
            })
        });
        
        if (response.ok) {
            await loadTasks();
        }
    } catch (error) {
        console.error('Error toggling checklist item:', error);
    }
}

async function addChecklistItemToTask(taskId, text) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            const task = await response.json();
            renderChecklistPreview(task.checklist);
        }
    } catch (error) {
        console.error('Error adding checklist item:', error);
    }
}

// === ДЕЙСТВИЯ С ЗАДАЧАМИ ===

async function markReady(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.telegram_id })
        });
        
        if (response.ok) {
            await loadTasks();
        }
    } catch (error) {
        console.error('Error marking ready:', error);
    }
}

async function markNotGoing(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/not-going`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.telegram_id })
        });
        
(response.ok); {
            await loadTasks();
        }
    } catch (error) {
        console.error('Error marking not going:', error);
    }
}

async function completePreparation(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadTasks();
        }
    } catch (error) {
        console.error('Error completing preparation:', error);
    }
}

async function uncompletePreparation(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/uncomplete`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadTasks();
        }
    } catch (error) {
        console.error('Error uncompleting preparation:', error);
    }
}

async function finishTask(taskId) {
    if (!confirm(t('confirmFinish', currentLang))) return;
    
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/finish`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadTasks();
            tg.showAlert('✅ Завдання завершено!');
        }
    } catch (error) {
        console.error('Error finishing task:', error);
    }
}

async function deleteTask(taskId) {
    if (!confirm(t('confirmDelete', currentLang))) return;
    
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadTasks();
            tg.showAlert(t('taskDeleted', currentLang));
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// === АРХИВ ===

async function loadArchive() {
    try {
        const [deleted, completed] = await Promise.all([
            fetch(`${API_URL}/api/archive/deleted`).then(r => r.json()),
            fetch(`${API_URL}/api/archive/completed`).then(r => r.json())
        ]);
        
        renderArchive(deleted, completed);
    } catch (error) {
        console.error('Error loading archive:', error);
    }
}

function renderArchive(deleted, completed) {
    const container = document.getElementById('archiveContainer');
    
    let html = `<h3>${t('deletedTasks', currentLang)}</h3>`;
    
    if (deleted.length === 0) {
        html += `<div class="empty-state">${t('noDeletedTasks', currentLang)}</div>`;
    } else {
        deleted.forEach(task => {
            html += createArchiveCard(task, 'deleted');
        });
    }
    
    html += `<h3 style="margin-top: 30px;">${t('completedTasks', currentLang)}</h3>`;
    
    if (completed.length === 0) {
        html += `<div class="empty-state">${t('noCompletedTasks', currentLang)}</div>`;
    } else {
        completed.forEach(task => {
            html += createArchiveCard(task, 'completed');
        });
    }
    
    container.innerHTML = html;
}

function createArchiveCard(task, type) {
    const eventDate = new Date(task.event_date);
    
    return `
        <div class="task-card" style="opacity: 0.7;">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-dates">
                <div class="date-item">
                    <div class="date-label">🎯 ${t('event', currentLang)}</div>
                    <div class="date-value">${formatDate(eventDate)}</div>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn btn-primary" onclick="restore${type === 'deleted' ? 'Deleted' : 'Completed'}Task('${task.id}')">
                    ${t('restoreTask', currentLang)}
                </button>
            </div>
        </div>
    `;
}

async function restoreDeletedTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/restore`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadArchive();
            tg.showAlert(t('taskRestored', currentLang));
        }
    } catch (error) {
        console.error('Error restoring task:', error);
    }
}

async function restoreCompletedTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}/restore-completed`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadArchive();
            tg.showAlert(t('taskRestored', currentLang));
        }
    } catch (error) {
        console.error('Error restoring task:', error);
    }
}

// === НАСТРОЙКИ ===

async function changeLanguage() {
    const newLang = currentLang === 'uk' ? 'en' : 'uk';
    
    try {
        const response = await fetch(`${API_URL}/api/user/${currentUser.telegram_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: newLang })
        });
        
        if (response.ok) {
            currentLang = newLang;
            currentUser.language = newLang;
            updateUI();
            renderView();
        }
    } catch (error) {
        console.error('Error changing language:', error);
    }
}

// === ПОИСК ===

async function searchTasks() {
    const dateFrom = document.getElementById('searchDateFrom').value;
    const dateTo = document.getElementById('searchDateTo').value;
    
    try {
        let url = `${API_URL}/api/tasks/search?`;
        if (dateFrom) url += `date_from=${new Date(dateFrom).toISOString()}&`;
        if (dateTo) url += `date_to=${new Date(dateTo).toISOString()}`;
        
        const response = await fetch(url);
        currentTasks = await response.json();
        renderTasksList();
    } catch (error) {
        console.error('Error searching tasks:', error);
    }
}

function resetSearch() {
    document.getElementById('searchDateFrom').value = '';
    document.getElementById('searchDateTo').value = '';
    loadTasks();
}

// === УТИЛИТЫ ===

function formatDate(date) {
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    const options = { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    
    let formatted = date.toLocaleDateString(currentLang, options);
    
    if (currentLang === 'uk') {
        if (days === 0) formatted += ' (сьогодні)';
        else if (days === 1) formatted += ' (завтра)';
        else if (days > 1 && days < 7) formatted += ` (через ${days} дн.)`;
        else if (days < 0) formatted += ' (прострочено)';
    } else {
        if (days === 0) formatted += ' (today)';
        else if (days === 1) formatted += ' (tomorrow)';
        else if (days > 1 && days < 7) formatted += ` (in ${days} days)`;
        else if (days < 0) formatted += ' (overdue)';
    }
    
    return formatted;
}

// === ЗАПУСК ===

tg.ready();
init();