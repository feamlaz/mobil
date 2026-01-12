class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'active';
        this.currentProject = 'all';
        this.editingTaskId = null;
        this.timers = {};
        this.comments = {};
        this.achievements = [];
        this.quickNotes = localStorage.getItem('quickNotes') || '';
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        console.log('Initializing TodoApp...');
        this.setupApp();
    }
    
    setupApp() {
        console.log('Setting up app...');
        
        this.registerServiceWorker();
        this.setupPWA();
        this.setupOnlineStatus();
        this.setupMobileMenu();
        this.setupTouchGestures();
        this.handleOrientationChange();
        this.detectStandaloneMode();
        this.setupIOSPWA();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.setupRepeats();
        this.initSidebar();
        this.startClock();
        this.initChart();
        this.initCalendar();
        this.checkAchievements();
        
        console.log('App setup complete');
    }
    
    detectStandaloneMode() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true ||
                            document.referrer.includes('android-app://');
        
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isStandalone && isIos) {
            document.body.classList.add('ios-standalone');
            console.log('Running in iOS standalone mode');
            this.hideBrowserElements();
        } else if (isStandalone) {
            document.body.classList.add('pwa-standalone');
            console.log('Running in standalone mode');
        } else {
            console.log('Running in browser mode');
        }
        
        if (isIos) {
            document.body.classList.add('ios-device');
        }
    }
    
    hideBrowserElements() {
        const browserElements = document.querySelectorAll('.browser-only');
        browserElements.forEach(el => el.style.display = 'none');
    }
    
    setupIOSPWA() {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIos) {
            const iosStyles = document.createElement('style');
            iosStyles.textContent = `
                .ios-device {
                    -webkit-appearance: none;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .ios-device input,
                .ios-device select,
                .ios-device textarea {
                    -webkit-appearance: none;
                    border-radius: 0;
                    background: transparent;
                }
                
                .ios-device .filter-btn {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-user-select: none;
                }
                
                .ios-standalone .header {
                    padding-top: env(safe-area-inset-top);
                }
                
                .ios-standalone .menu-toggle {
                    top: calc(env(safe-area-inset-top) + 10px);
                }
            `;
            document.head.appendChild(iosStyles);
        }
    }
    
    setupMobileMenu() {
        const leftToggle = document.getElementById('leftMenuToggle');
        const rightToggle = document.getElementById('rightMenuToggle');
        const overlay = document.getElementById('overlay');
        const leftSidebar = document.querySelector('.sidebar-left');
        const rightSidebar = document.querySelector('.sidebar-right');
        
        if (!leftToggle || !rightToggle || !overlay) return;
        
        leftToggle.addEventListener('click', () => {
            leftSidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            if (rightSidebar.classList.contains('active')) {
                rightSidebar.classList.remove('active');
            }
        });
        
        rightToggle.addEventListener('click', () => {
            rightSidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            if (leftSidebar.classList.contains('active')) {
                leftSidebar.classList.remove('active');
            }
        });
        
        overlay.addEventListener('click', () => {
            leftSidebar.classList.remove('active');
            rightSidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                leftSidebar.classList.remove('active');
                rightSidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }
    
    setupTouchGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        const leftSidebar = document.querySelector('.sidebar-left');
        const rightSidebar = document.querySelector('.sidebar-right');
        const overlay = document.getElementById('overlay');
        
        const isMobile = window.innerWidth <= 1000;
        
        if (!isMobile) return;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
        
        function handleSwipe() {
            const swipeThreshold = 100;
            const diff = touchEndX - touchStartX;
            
            if (diff > swipeThreshold && touchStartX < 50) {
                leftSidebar.classList.add('active');
                overlay.classList.add('active');
                rightSidebar.classList.remove('active');
            }
            
            if (diff < -swipeThreshold && touchStartX > window.innerWidth - 50) {
                rightSidebar.classList.add('active');
                overlay.classList.add('active');
                leftSidebar.classList.remove('active');
            }
            
            if (Math.abs(diff) < 50 && Math.abs(touchEndX - window.innerWidth / 2) < 100) {
                leftSidebar.classList.remove('active');
                rightSidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }
    
    handleOrientationChange() {
        const handleOrientation = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            
            if (isLandscape && window.innerWidth <= 768) {
                document.body.classList.add('mobile-landscape');
                
                document.querySelector('.sidebar-left')?.classList.remove('active');
                document.querySelector('.sidebar-right')?.classList.remove('active');
                document.getElementById('overlay')?.classList.remove('active');
            } else {
                document.body.classList.remove('mobile-landscape');
            }
        };
        
        window.addEventListener('orientationchange', handleOrientation);
        window.addEventListener('resize', handleOrientation);
        
        handleOrientation();
    }
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        }
    }
    
    setupPWA() {
        let deferredPrompt;
        const installBtn = document.createElement('button');
        installBtn.innerHTML = '📱 Установить приложение';
        installBtn.className = 'install-btn';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            font-family: 'Comfortaa', cursive;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        installBtn.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted A2HS prompt');
                        installBtn.style.display = 'none';
                    }
                    deferredPrompt = null;
                });
            }
        });
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.body.appendChild(installBtn);
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            if (installBtn.parentNode) {
                installBtn.parentNode.removeChild(installBtn);
            }
        });
    }
    
    setupOnlineStatus() {
        const updateOnlineStatus = () => {
            this.isOnline = navigator.onLine;
            const statusElement = document.querySelector('.status-active');
            if (statusElement) {
                statusElement.textContent = this.isOnline ? '🟢 Активен' : '🔴 Оффлайн';
                statusElement.className = this.isOnline ? 'info-value status-active' : 'info-value status-offline';
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        updateOnlineStatus();
    }
    
    bindEvents() {
        console.log('Binding events...');
        
        const addBtn = document.getElementById('addTaskBtn');
        const taskInput = document.getElementById('taskInput');
        const priorityInput = document.getElementById('priorityInput');
        
        console.log('Elements found:', {
            addBtn: !!addBtn,
            taskInput: !!taskInput,
            priorityInput: !!priorityInput
        });
        
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                console.log('Add button clicked!', e);
                e.preventDefault();
                this.addTaskFromInput();
            });
        } else {
            console.error('addTaskBtn not found!');
        }
        
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter pressed');
                    this.addTaskFromInput();
                }
            });
        }
        
        // Модальное окно
        const saveBtn = document.getElementById('saveTaskBtn');
        const cancelBtn = document.getElementById('cancelTaskBtn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTask());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeTaskModal());
        }
        
        // Кнопки действий
        document.getElementById('clearCompleted')?.addEventListener('click', () => this.clearCompletedTasks());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportTasks());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        
        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        console.log('Events bound successfully');
    }
    
    addTaskFromInput() {
        console.log('addTaskFromInput called');
        
        const titleInput = document.getElementById('taskInput');
        const priorityInput = document.getElementById('priorityInput');
        
        if (!titleInput || !priorityInput) {
            console.error('Input elements not found!');
            return;
        }
        
        const title = titleInput.value.trim();
        
        if (!title) {
            this.showNotification('Введите название задачи', 'error');
            return;
        }
        
        const task = {
            id: Date.now(),
            title: title,
            description: '',
            priority: priorityInput.value,
            completed: false,
            createdAt: new Date().toISOString(),
            assignee: 'Я',
            project: '',
            tags: []
        };
        
        console.log('Creating task:', task);
        
        this.tasks.push(task);
        this.saveTasks();
        this.render();
        this.updateStats();
        
        titleInput.value = '';
        priorityInput.value = 'medium';
        
        this.showNotification('Задача добавлена!', 'success');
    }
    
    openTaskModal() {
        document.getElementById('taskModal').style.display = 'block';
        document.getElementById('modalTaskTitle').focus();
    }
    
    closeTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.clearTaskForm();
    }
    
    clearTaskForm() {
        document.getElementById('modalTaskTitle').value = '';
        document.getElementById('modalTaskDescription').value = '';
        document.getElementById('modalTaskDatetime').value = '';
        document.getElementById('modalTaskPriority').value = 'medium';
        document.getElementById('modalTaskProject').value = '';
        document.getElementById('modalTaskTags').value = '';
        document.getElementById('modalTaskAssignee').value = '';
        document.getElementById('modalTaskRepeat').value = '';
    }
    
    saveTask() {
        const title = document.getElementById('modalTaskTitle').value.trim();
        const description = document.getElementById('modalTaskDescription').value.trim();
        const dateTime = document.getElementById('modalTaskDatetime').value;
        const priority = document.getElementById('modalTaskPriority').value;
        const project = document.getElementById('modalTaskProject').value;
        const tags = document.getElementById('modalTaskTags').value.trim();
        const assignee = document.getElementById('modalTaskAssignee').value.trim();
        const repeat = document.getElementById('modalTaskRepeat').value;
        
        if (title === '') {
            alert('Введите название задачи!');
            return;
        }

        const task = {
            id: Date.now(),
            title: title,
            description: description,
            dateTime: dateTime || null,
            priority: priority,
            project: project,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
            assignee: assignee || null,
            completed: false,
            repeat: repeat || null,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        this.closeTaskModal();
        this.updateStats();
    }
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
            this.updateStats();
        }
    }
    
    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.render();
        this.updateStats();
    }
    
    clearCompletedTasks() {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.render();
        this.updateStats();
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }
    
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `tasks_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    openSettings() {
        alert('Настройки в разработке!');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #e74c3c, #c0392b)'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            font-family: 'Comfortaa', cursive;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }
    
    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const activeTasks = totalTasks - completedTasks;
        
        const totalEl = document.getElementById('totalTasks');
        const activeEl = document.getElementById('activeTasks');
        const completedEl = document.getElementById('completedTasks');
        
        if (totalEl) totalEl.textContent = totalTasks;
        if (activeEl) activeEl.textContent = activeTasks;
        if (completedEl) completedEl.textContent = completedTasks;
    }
    
    render() {
        const taskList = document.getElementById('taskList');
        if (!taskList) {
            console.error('taskList not found!');
            return;
        }
        
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">Нет задач</div>';
            return;
        }
        
        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-item" data-id="${task.id}">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span>🎯 ${task.priority || 'medium'}</span>
                    ${task.assignee ? `<span>👤 ${task.assignee}</span>` : ''}
                    ${task.project ? `<span>📁 ${task.project}</span>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="app.toggleTask(${task.id})" class="${task.completed ? 'completed' : ''}">
                        ${task.completed ? '✅' : '⭕'}
                    </button>
                    <button onclick="app.deleteTask(${task.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    getFilteredTasks() {
        let filtered = this.tasks;
        
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
            case 'today':
                const today = new Date().toDateString();
                filtered = filtered.filter(t => {
                    return t.dateTime && new Date(t.dateTime).toDateString() === today;
                });
                break;
            case 'urgent':
                filtered = filtered.filter(t => t.priority === 'high' && !t.completed);
                break;
        }
        
        return filtered;
    }
    
    initSidebar() {
        // Инициализация исполнителей
        const assigneesList = document.getElementById('assigneesList');
        if (assigneesList) {
            const assignees = ['Я', 'Команда', 'Семья', 'Работа'];
            assigneesList.innerHTML = assignees.map(assignee => `
                <div class="assignee-item">
                    <div class="assignee-avatar">${assignee[0]}</div>
                    <div class="assignee-info">
                        <div class="assignee-name">${assignee}</div>
                        <div class="assignee-count">${this.tasks.filter(t => t.assignee === assignee).length} задач</div>
                    </div>
                </div>
            `).join('');
        }
        
        // Быстрые фильтры
        const quickFilters = document.getElementById('quickFilters');
        if (quickFilters) {
            const filters = ['🔥 Горящие', '📅 Сегодня', '🏠 Дом', '💼 Работа'];
            quickFilters.innerHTML = filters.map(filter => `
                <div class="quick-filter-tag">${filter}</div>
            `).join('');
        }
        
        // Срочные задачи
        const urgentTasks = document.getElementById('urgentTasks');
        if (urgentTasks) {
            const urgent = this.tasks.filter(t => t.priority === 'high' && !t.completed).slice(0, 3);
            urgentTasks.innerHTML = urgent.map(task => `
                <div class="urgent-task-item">${task.title}</div>
            `).join('');
        }
        
        // Быстрые заметки
        const quickNotes = document.getElementById('quickNotes');
        if (quickNotes) {
            quickNotes.value = this.quickNotes;
            quickNotes.addEventListener('input', (e) => {
                this.quickNotes = e.target.value;
                localStorage.setItem('quickNotes', this.quickNotes);
            });
        }
        
        // Статистика в сайдбаре
        const sidebarStats = document.getElementById('sidebarStats');
        if (sidebarStats) {
            const totalTasks = this.tasks.length;
            const completedTasks = this.tasks.filter(t => t.completed).length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            sidebarStats.innerHTML = `
                <div class="mini-stat">
                    <span class="mini-stat-number">${totalTasks}</span>
                    <span class="mini-stat-label">Всего</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-number">${completedTasks}</span>
                    <span class="mini-stat-label">Готово</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-number">${completionRate}%</span>
                    <span class="mini-stat-label">Выполнено</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-number">${this.tasks.filter(t => t.priority === 'high').length}</span>
                    <span class="mini-stat-label">Срочно</span>
                </div>
            `;
        }
    }
    
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ru-RU');
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    initChart() {
        // Простая инициализация графика
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">📊 График в разработке</div>';
        }
    }
    
    initCalendar() {
        const calendarWidget = document.getElementById('calendarWidget');
        if (calendarWidget) {
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
            
            let calendarHTML = '<div style="text-align: center; margin-bottom: 10px;">📅 ' + now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) + '</div>';
            calendarHTML += '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; font-size: 10px;">';
            
            // Дни недели
            const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
            weekDays.forEach(day => {
                calendarHTML += `<div style="text-align: center; font-weight: bold; color: rgba(255,255,255,0.8);">${day}</div>`;
            });
            
            // Пустые ячейки до начала месяца
            for (let i = 0; i < firstDay - 1; i++) {
                calendarHTML += '<div></div>';
            }
            
            // Дни месяца
            for (let day = 1; day <= daysInMonth; day++) {
                const isToday = day === now.getDate();
                const hasTasks = this.tasks.some(t => {
                    if (!t.dateTime) return false;
                    const taskDate = new Date(t.dateTime);
                    return taskDate.getDate() === day && taskDate.getMonth() === now.getMonth();
                });
                
                calendarHTML += `<div style="text-align: center; padding: 2px; background: ${isToday ? 'rgba(52, 152, 219, 0.3)' : hasTasks ? 'rgba(231, 76, 60, 0.2)' : 'transparent'}; border-radius: 4px; color: ${isToday ? 'white' : 'rgba(255,255,255,0.8)'};">${day}</div>`;
            }
            
            calendarHTML += '</div>';
            calendarWidget.innerHTML = calendarHTML;
        }
    }
    
    checkAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        if (achievementsList) {
            const totalTasks = this.tasks.length;
            const completedTasks = this.tasks.filter(t => t.completed).length;
            
            const achievements = [];
            
            if (totalTasks >= 1) achievements.push({ icon: '🎯', title: 'Первая задача', desc: 'Создали первую задачу' });
            if (completedTasks >= 5) achievements.push({ icon: '⭐', title: 'Продуктивность', desc: 'Выполнили 5 задач' });
            if (completedTasks >= 10) achievements.push({ icon: '🏆', title: 'Мастер', desc: 'Выполнили 10 задач' });
            if (totalTasks >= 20) achievements.push({ icon: '💎', title: 'Организатор', desc: 'Создали 20 задач' });
            
            achievementsList.innerHTML = achievements.map(achievement => `
                <div class="achievement-item">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-desc">${achievement.desc}</div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    setupRepeats() {
        // Настройка повторяющихся задач
        setInterval(() => {
            this.checkRepeatingTasks();
        }, 60000); // Проверка каждую минуту
    }
    
    checkRepeatingTasks() {
        const now = new Date();
        
        this.tasks.forEach(task => {
            if (task.repeat && task.completed) {
                const taskDate = new Date(task.dateTime);
                let shouldRepeat = false;
                
                switch (task.repeat) {
                    case 'daily':
                        shouldRepeat = now.getDate() !== taskDate.getDate() || now.getMonth() !== taskDate.getMonth();
                        break;
                    case 'weekly':
                        const daysDiff = Math.floor((now - taskDate) / (1000 * 60 * 60 * 24));
                        shouldRepeat = daysDiff >= 7;
                        break;
                    case 'monthly':
                        shouldRepeat = now.getMonth() !== taskDate.getMonth() || now.getFullYear() !== taskDate.getFullYear();
                        break;
                }
                
                if (shouldRepeat) {
                    // Создаем новую задачу на основе повторяющейся
                    const newTask = {
                        ...task,
                        id: Date.now(),
                        completed: false,
                        dateTime: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    };
                    
                    this.tasks.push(newTask);
                    this.saveTasks();
                    this.render();
                    this.updateStats();
                    
                    this.showNotification(`Повторяющаяся задача "${task.title}" создана`, 'success');
                }
            }
        });
    }
}

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .achievement-item {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .achievement-icon {
        font-size: 20px;
    }
    
    .achievement-info {
        flex: 1;
    }
    
    .achievement-title {
        color: white;
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 2px;
    }
    
    .achievement-desc {
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
    }
`;
document.head.appendChild(style);

// Инициализация приложения
console.log('Creating TodoApp instance...');
window.app = new TodoApp();
