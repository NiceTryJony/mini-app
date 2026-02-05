const translations = {
    uk: {
        // Общее
        appTitle: "Менеджер завдань",
        loading: "Завантаження...",
        error: "Помилка",
        save: "Зберегти",
        cancel: "Скасувати",
        delete: "Видалити",
        edit: "Редагувати",
        close: "Закрити",
        
        // Навигация
        navTasks: "Завдання",
        navArchive: "Архів",
        navSettings: "Налаштування",
        
        // Задачи
        noTasks: "Поки немає завдань. Створіть перше!",
        createTask: "+ Створити завдання",
        newTask: "Нове завдання",
        editTask: "Редагувати завдання",
        
        // Поля задачи
        title: "Назва",
        titlePlaceholder: "Назва завдання",
        description: "Опис",
        descriptionPlaceholder: "Опис завдання (необов'язково)",
        eventDate: "Дата події",
        preparationDate: "Дата підготовки",
        photos: "Фотографії",
        addPhoto: "Додати фото",
        checklist: "Чек-лист",
        addChecklistItem: "Додати пункт",
        showChecklist: "Показати чек-лист",
        hideChecklist: "Сховати чек-лист",
        
        // Статусы
        statusFuture: "Майбутнє",
        statusPreparation: "Підготовка",
        statusCompleted: "Підготовка завершена",
        statusUrgent: "Терміново!",
        
        // Действия
        readyForEvent: "Готові до події",
        markReady: "✓ Готовий",
        markNotGoing: "✗ Не йду",
        completePreparation: "✓ Завершити підготовку",
        uncompletePreparation: "↩ Скасувати завершення",
        finishTask: "🏁 Завершити завдання",
        restoreTask: "↩ Відновити",
        
        // Уведомления
        taskCreated: "✅ Завдання створено!",
        taskUpdated: "✅ Завдання оновлено!",
        taskDeleted: "🗑 Завдання видалено",
        taskRestored: "↩ Завдання відновлено",
        photoUploaded: "✅ Фото завантажено!",
        
        // Архив
        deletedTasks: "Видалені завдання",
        completedTasks: "Завершені завдання",
        noDeletedTasks: "Немає видалених завдань",
        noCompletedTasks: "Немає завершених завдань",
        
        // Настройки
        language: "Мова",
        languageUk: "Українська",
        languageEn: "English",
        timezone: "Часовий пояс",
        
        // Подтверждения
        confirmDelete: "Видалити це завдання?",
        confirmFinish: "Завершити це завдання? Воно буде переміщено в архів.",
        
        // Автор
        createdBy: "Створив",
        
        // Даты
        preparation: "Підготовка",
        event: "Подія",
        
        // Поиск
        searchByDate: "Пошук за датою",
        dateFrom: "Від",
        dateTo: "До",
        search: "Шукати",
        resetSearch: "Скинути"
    },
    
    en: {
        // General
        appTitle: "Task Manager",
        loading: "Loading...",
        error: "Error",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        close: "Close",
        
        // Navigation
        navTasks: "Tasks",
        navArchive: "Archive",
        navSettings: "Settings",
        
        // Tasks
        noTasks: "No tasks yet. Create the first one!",
        createTask: "+ Create Task",
        newTask: "New Task",
        editTask: "Edit Task",
        
        // Task fields
        title: "Title",
        titlePlaceholder: "Task title",
        description: "Description",
        descriptionPlaceholder: "Task description (optional)",
        eventDate: "Event Date",
        preparationDate: "Preparation Date",
        photos: "Photos",
        addPhoto: "Add Photo",
        checklist: "Checklist",
        addChecklistItem: "Add Item",
        showChecklist: "Show Checklist",
        hideChecklist: "Hide Checklist",
        
        // Statuses
        statusFuture: "Future",
        statusPreparation: "Preparation",
        statusCompleted: "Preparation Completed",
        statusUrgent: "Urgent!",
        
        // Actions
        readyForEvent: "Ready for Event",
        markReady: "✓ Ready",
        markNotGoing: "✗ Not Going",
        completePreparation: "✓ Complete Preparation",
        uncompletePreparation: "↩ Undo Completion",
        finishTask: "🏁 Finish Task",
        restoreTask: "↩ Restore",
        
        // Notifications
        taskCreated: "✅ Task created!",
        taskUpdated: "✅ Task updated!",
        taskDeleted: "🗑 Task deleted",
        taskRestored: "↩ Task restored",
        photoUploaded: "✅ Photo uploaded!",
        
        // Archive
        deletedTasks: "Deleted Tasks",
        completedTasks: "Completed Tasks",
        noDeletedTasks: "No deleted tasks",
        noCompletedTasks: "No completed tasks",
        
        // Settings
        language: "Language",
        languageUk: "Українська",
        languageEn: "English",
        timezone: "Timezone",
        
        // Confirmations
        confirmDelete: "Delete this task?",
        confirmFinish: "Finish this task? It will be moved to archive.",
        
        // Author
        createdBy: "Created by",
        
        // Dates
        preparation: "Preparation",
        event: "Event",
        
        // Search
        searchByDate: "Search by Date",
        dateFrom: "From",
        dateTo: "To",
        search: "Search",
        resetSearch: "Reset"
    }
};

function t(key, lang = 'uk') {
    return translations[lang][key] || key;
}