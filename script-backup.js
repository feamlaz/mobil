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
    }
    
    detectStandaloneMode() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true ||
                            document.referrer.includes('android-app://');
        
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isStandalone && isIos) {
            // iOS PWA режим
            document.body.classList.add('ios-standalone');
            console.log('Running in iOS standalone mode');
            
            // Скрываем адресную строку и элементы навигации
            this.hideBrowserElements();
        } else if (isStandalone) {
            // Другие PWA режимы
            document.body.classList.add('pwa-standalone');
            console.log('Running in standalone mode');
        } else {
            // Обычный браузер
            console.log('Running in browser mode');
        }
        
        // Добавляем класс для iOS
        if (isIos) {
            document.body.classList.add('ios-device');
        }
    }
    
    hideBrowserElements() {
        // Скрываем элементы браузера в PWA режиме
        const browserElements = document.querySelectorAll('.browser-only');
        browserElements.forEach(el => el.style.display = 'none');
    }
    
    setupIOSPWA() {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIos) {
            // Добавляем специальные стили для iOS
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
            
            // Закрываем правую панель если открыта
            if (rightSidebar.classList.contains('active')) {
                rightSidebar.classList.remove('active');
            }
        });
        
        rightToggle.addEventListener('click', () => {
            rightSidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Закрываем левую панель если открыта
            if (leftSidebar.classList.contains('active')) {
                leftSidebar.classList.remove('active');
            }
        });
        
        overlay.addEventListener('click', () => {
            leftSidebar.classList.remove('active');
            rightSidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
        
        // Закрытие при ESC
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
        
        // Определяем является ли устройство мобильным
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
            
            // Свайп вправо - открываем левую панель
            if (diff > swipeThreshold && touchStartX < 50) {
                leftSidebar.classList.add('active');
                overlay.classList.add('active');
                rightSidebar.classList.remove('active');
            }
            
            // Свайп влево - открываем правую панель
            if (diff < -swipeThreshold && touchStartX > window.innerWidth - 50) {
                rightSidebar.classList.add('active');
                overlay.classList.add('active');
                leftSidebar.classList.remove('active');
            }
            
            // Свайп от центра к краю - закрываем панели
            if (Math.abs(diff) < 50 && Math.abs(touchEndX - window.innerWidth / 2) < 100) {
                leftSidebar.classList.remove('active');
                rightSidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }
    
    optimizeForMobile() {
        // Оптимизация производительности для мобильных
        if (window.innerWidth <= 768) {
            // Уменьшаем количество анимаций
            document.body.style.setProperty('--animation-duration', '0.2s');
            
            // Отключаем тяжелые эффекты
            const heavyElements = document.querySelectorAll('.task-item, .modal-content');
            heavyElements.forEach(el => {
                el.style.willChange = 'transform';
            });
            
            // Оптимизация скролла
            const taskList = document.querySelector('.task-list');
            if (taskList) {
                taskList.style.overflowScrolling = 'touch';
                taskList.style.webkitOverflowScrolling = 'touch';
            }
        }
    }
    
    handleOrientationChange() {
        const handleOrientation = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            
            if (isLandscape && window.innerWidth <= 768) {
                // Альбомная ориентация на мобильном
                document.body.classList.add('mobile-landscape');
                
                // Автоматически закрываем боковые панели
                document.querySelector('.sidebar-left')?.classList.remove('active');
                document.querySelector('.sidebar-right')?.classList.remove('active');
                document.getElementById('overlay')?.classList.remove('active');
            } else {
                document.body.classList.remove('mobile-landscape');
            }
            
            this.optimizeForMobile();
        };
        
        window.addEventListener('orientationchange', handleOrientation);
        window.addEventListener('resize', handleOrientation);
        
        // Вызываем сразу
        handleOrientation();
    }
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateNotification();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        }
    }
    
    setupPWA() {
        // Install button
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
                        console.log('User accepted the A2HS prompt');
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
        
        // Hide install button if already installed
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
            
            if (this.isOnline) {
                this.syncData();
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        updateOnlineStatus();
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
                this.subscribeToPush();
            }
        }
    }
    
    async subscribeToPush() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array('your-vapid-public-key')
                });
                
                console.log('Push subscription:', subscription);
                // Send subscription to server
            } catch (error) {
                console.error('Push subscription error:', error);
            }
        }
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #2ecc71, #27ae60);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
                z-index: 1001;
                font-family: 'Comfortaa', cursive;
                max-width: 300px;
            ">
                <div style="font-weight: 600; margin-bottom: 8px;">🔄 Обновление доступно</div>
                <div style="font-size: 12px; margin-bottom: 12px;">Новая версия приложения готова к установке</div>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #2ecc71;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-family: 'Comfortaa', cursive;
                    font-weight: 600;
                ">Обновить</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-family: 'Comfortaa', cursive;
                    font-weight: 600;
                    margin-left: 8px;
                ">Позже</button>
            </div>
        `;
        document.body.appendChild(notification);
    }
    
    syncData() {
        // Sync tasks with server when back online
        console.log('Syncing data with server...');
        // Implementation for server sync
    }
    
    showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    icon: '/icon-192x192.png',
                    badge: '/icon-72x72.png',
                    ...options
                });
            });
        });
            if (e.target.id === 'editModal') this.closeEditModal();
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchByAssignee(e.target.value));
        
        // Repeat checkbox events
        document.getElementById('taskRepeatCheckbox').addEventListener('change', (e) => {
            document.getElementById('taskRepeatInput').style.display = e.target.checked ? 'block' : 'none';
        });
        
        document.getElementById('editTaskRepeatCheckbox').addEventListener('change', (e) => {
            document.getElementById('editTaskRepeatInput').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Sidebar events
        document.getElementById('quickNotes').addEventListener('input', (e) => this.saveQuickNotes(e.target.value));
        document.getElementById('quickAddBtn').addEventListener('click', () => this.quickAddTask());
        document.getElementById('importBtn').addEventListener('click', () => this.importTasks());
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());
        document.getElementById('notificationsBtn').addEventListener('click', () => this.toggleNotifications());
    }

    openTaskModal() {
        document.getElementById('taskModal').style.display = 'block';
        document.getElementById('taskTitleInput').focus();
    }
    
    closeTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.clearTaskForm();
    }
    
    clearTaskForm() {
        document.getElementById('taskTitleInput').value = '';
        document.getElementById('taskDescriptionInput').value = '';
        document.getElementById('taskDateTimeInput').value = '';
        document.getElementById('taskPriorityInput').value = 'medium';
        document.getElementById('taskProjectInput').value = 'personal';
        document.getElementById('taskTagsInput').value = '';
        document.getElementById('taskAssigneeInput').value = '';
        document.getElementById('taskRepeatCheckbox').checked = false;
        document.getElementById('taskRepeatInput').style.display = 'none';
        document.getElementById('taskRepeatInput').value = 'daily';
    }
    
    saveTask() {
        const title = document.getElementById('taskTitleInput').value.trim();
        const description = document.getElementById('taskDescriptionInput').value.trim();
        const dateTime = document.getElementById('taskDateTimeInput').value;
        const priority = document.getElementById('taskPriorityInput').value;
        const project = document.getElementById('taskProjectInput').value;
        const tags = document.getElementById('taskTagsInput').value.trim();
        const assignee = document.getElementById('taskAssigneeInput').value.trim();
        const isRepeat = document.getElementById('taskRepeatCheckbox').checked;
        const repeatType = isRepeat ? document.getElementById('taskRepeatInput').value : null;
        
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
            status: 'active',
            repeat: isRepeat ? repeatType : null,
            createdAt: new Date().toISOString(),
            timer: 0,
            comments: []
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        this.closeTaskModal();
        
        // Set up repeat if needed
        if (isRepeat) {
            this.setupRepeat(task);
        }
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.status !== 'paused') {
            task.status = task.status === 'active' ? 'completed' : 'active';
            this.saveTasks();
            this.render();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.render();
    }
    
    togglePause(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.status !== 'completed') {
            task.status = task.status === 'active' ? 'paused' : 'active';
            this.saveTasks();
            this.render();
        }
    }
    
    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.status === 'active') {
            this.editingTaskId = id;
            document.getElementById('editTaskInput').value = task.title;
            document.getElementById('editTaskDescriptionInput').value = task.description || '';
            document.getElementById('editTaskDateTime').value = task.dateTime || '';
            document.getElementById('editTaskPriority').value = task.priority || 'medium';
            document.getElementById('editTaskProject').value = task.project || 'personal';
            document.getElementById('editTaskTagsInput').value = task.tags ? task.tags.join(', ') : '';
            document.getElementById('editTaskAssigneeInput').value = task.assignee || '';
            
            const hasRepeat = !!task.repeat;
            document.getElementById('editTaskRepeatCheckbox').checked = hasRepeat;
            document.getElementById('editTaskRepeatInput').style.display = hasRepeat ? 'block' : 'none';
            document.getElementById('editTaskRepeatInput').value = task.repeat || 'daily';
            
            document.getElementById('editModal').style.display = 'block';
        }
    }
    
    saveEdit() {
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (task) {
            const title = document.getElementById('editTaskInput').value.trim();
            if (title === '') {
                alert('Введите название задачи!');
                return;
            }
            
            task.title = title;
            task.description = document.getElementById('editTaskDescriptionInput').value.trim();
            task.dateTime = document.getElementById('editTaskDateTime').value || null;
            task.priority = document.getElementById('editTaskPriority').value;
            task.project = document.getElementById('editTaskProject').value;
            const tags = document.getElementById('editTaskTagsInput').value.trim();
            task.tags = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];
            task.assignee = document.getElementById('editTaskAssigneeInput').value.trim() || null;
            
            const isRepeat = document.getElementById('editTaskRepeatCheckbox').checked;
            task.repeat = isRepeat ? document.getElementById('editTaskRepeatInput').value : null;
            
            this.saveTasks();
            this.render();
            this.updateStats();
            this.closeEditModal();
        }
    }
    
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editingTaskId = null;
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(t => t.status !== 'completed');
        this.saveTasks();
        this.render();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }
    
    setProjectFilter(project) {
        this.currentProject = project;
        this.render();
    }
    
    searchByTags(searchValue) {
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
    
    setupRepeat(task) {
        if (!task.repeat) return;
        
        const now = new Date();
        const nextDate = new Date(task.dateTime || now);
        
        switch (task.repeat) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
        }
        
        // Schedule next repeat
        const delay = nextDate - now;
        setTimeout(() => {
            this.createRepeatTask(task);
        }, delay);
    }
    
    createRepeatTask(originalTask) {
        const newTask = {
            ...originalTask,
            id: Date.now(),
            status: 'active',
            createdAt: new Date().toISOString(),
            timer: 0,
            comments: []
        };
        
        this.tasks.unshift(newTask);
        this.saveTasks();
        this.render();
        this.updateStats();
        
        // Setup next repeat
        this.setupRepeat(newTask);
    }
    
    updateStats() {
        const totalTasks = this.tasks.length;
        const today = new Date().toDateString();
        const completedToday = this.tasks.filter(t => 
            t.status === 'completed' && 
            new Date(t.createdAt).toDateString() === today
        ).length;
        const overdueTasks = this.tasks.filter(t => {
            if (!t.dateTime || t.status === 'completed') return false;
            return new Date(t.dateTime) < new Date();
        }).length;
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('overdueTasks').textContent = overdueTasks;
        
        this.updateTaskCount();
        this.updateSidebarStats();
    }
    
    updateTaskCount() {
        const activeCount = this.tasks.filter(t => t.status === 'active').length;
        const pausedCount = this.tasks.filter(t => t.status === 'paused').length;
        const completedCount = this.tasks.filter(t => t.status === 'completed').length;
        
        let statsText = '';
        if (this.currentFilter === 'all') {
            statsText = `${activeCount} активных, ${pausedCount} на паузе, ${completedCount} завершенных`;
        } else if (this.currentFilter === 'active') {
            statsText = `${activeCount} задач`;
        } else if (this.currentFilter === 'paused') {
            statsText = `${pausedCount} задач`;
        } else {
            statsText = `${completedCount} задач`;
        }
        
        document.getElementById('taskCount').textContent = statsText;
        
        const clearBtn = document.getElementById('clearCompleted');
        clearBtn.style.display = completedCount > 0 ? 'block' : 'none';
    }

    getFilteredTasks() {
        let tasks = this.tasks;
        
        // Применяем фильтр по статусу
        switch (this.currentFilter) {
            case 'active':
                tasks = tasks.filter(t => t.status === 'active');
                break;
            case 'paused':
                tasks = tasks.filter(t => t.status === 'paused');
                break;
            case 'completed':
                tasks = tasks.filter(t => t.status === 'completed');
                break;
        }
        
        // Применяем фильтр по проекту
        if (this.currentProject !== 'all') {
            tasks = tasks.filter(t => t.project === this.currentProject);
        }
        
        // Применяем поиск по исполнителю
        const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
        if (searchValue) {
            tasks = tasks.filter(t => 
                t.assignee && t.assignee.toLowerCase().includes(searchValue)
            );
        }
        
        // Применяем поиск по тегам
        const tagValue = document.getElementById('tagSearch').value.trim().toLowerCase();
        if (tagValue) {
            tasks = tasks.filter(t => 
                t.tags && t.tags.some(tag => tag.toLowerCase().includes(tagValue))
            );
        }
        
        return tasks;
    }

    render() {
        const taskList = document.getElementById('taskList');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div class="empty-state">Нет задач для отображения</div>';
        } else {
            taskList.innerHTML = filteredTasks.map(task => {
                const dateTimeText = task.dateTime ? this.formatDateTime(task.dateTime) : '';
                const isCompleted = task.status === 'completed';
                const isPaused = task.status === 'paused';
                const priorityClass = `priority-${task.priority || 'medium'}`;
                const priorityText = this.getPriorityText(task.priority || 'medium');
                const projectText = this.getProjectText(task.project || 'personal');
                const isOverdue = task.dateTime && new Date(task.dateTime) < new Date() && !isCompleted;
                
                return `
                    <li class="task-item ${isCompleted ? 'completed' : ''} ${isPaused ? 'paused' : ''} ${isOverdue ? 'task-overdue' : ''}">
                        <input type="checkbox" 
                               class="task-checkbox" 
                               ${isCompleted ? 'checked' : ''} 
                               ${isPaused ? 'disabled' : ''}
                               onchange="app.toggleTask(${task.id})">
                        <div class="task-content">
                            <div>
                                <span class="task-text">${this.escapeHtml(task.title)}</span>
                                <span class="task-priority ${priorityClass}">${priorityText}</span>
                            </div>
                            ${task.description ? `<span class="task-description">${this.escapeHtml(task.description)}</span>` : ''}
                            ${task.project ? `<span class="task-project">${projectText}</span>` : ''}
                            ${task.tags && task.tags.length > 0 ? `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                            ${task.assignee ? `<span class="task-assignee">${this.escapeHtml(task.assignee)}</span>` : ''}
                            ${dateTimeText ? `<span class="task-datetime">${dateTimeText}</span>` : ''}
                            ${task.timer > 0 ? `<span class="task-timer">${this.formatTimer(task.timer)}</span>` : ''}
                            ${task.comments && task.comments.length > 0 ? `<span class="task-comments">${task.comments.length} комментариев</span>` : ''}
                        </div>
                        <div class="task-actions">
                            ${!isCompleted && !isPaused ? `<button class="task-action-btn" onclick="app.editTask(${task.id})">✏️</button>` : ''}
                            ${!isCompleted ? `<button class="task-action-btn" onclick="app.togglePause(${task.id})">${isPaused ? '▶️' : '⏸️'}</button>` : ''}
                            <button class="task-action-btn" onclick="app.deleteTask(${task.id})">🗑️</button>
                        </div>
                    </li>
                `;
            }).join('');
        }
        
        this.updateStats();
        this.initSidebar();
        this.initChart();
        this.checkAchievements();
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const today = new Date().toDateString();
        const completedToday = this.tasks.filter(t => 
            t.status === 'completed' && 
            new Date(t.createdAt).toDateString() === today
        ).length;
        const overdueTasks = this.tasks.filter(t => {
            if (!t.dateTime || t.status === 'completed') return false;
            return new Date(t.dateTime) < new Date();
        }).length;
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('overdueTasks').textContent = overdueTasks;
        
        this.updateTaskCount();
        this.updateSidebarStats();
    }
    
    updateTaskCount() {
        const activeCount = this.tasks.filter(t => t.status === 'active').length;
        const pausedCount = this.tasks.filter(t => t.status === 'paused').length;
        const completedCount = this.tasks.filter(t => t.status === 'completed').length;
        
        let statsText = '';
        if (this.currentFilter === 'all') {
            statsText = `${activeCount} активных, ${pausedCount} на паузе, ${completedCount} завершенных`;
        } else if (this.currentFilter === 'active') {
            statsText = `${activeCount} задач`;
        } else if (this.currentFilter === 'paused') {
            statsText = `${pausedCount} задач`;
        } else {
            statsText = `${completedCount} задач`;
        }
        
        document.getElementById('taskCount').textContent = statsText;
        
        const clearBtn = document.getElementById('clearCompleted');
        clearBtn.style.display = completedCount > 0 ? 'block' : 'none';
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        const date = new Date(dateTimeString);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleString('ru-RU', options);
    }
    
    setupRepeats() {
        this.tasks.forEach(task => {
            if (task.repeat && task.status === 'active') {
                this.setupRepeat(task);
            }
        });
    }
    
    searchByAssignee(searchValue) {
        this.render();
    }
    
    getPriorityText(priority) {
        const priorities = {
            'low': 'Низкий',
            'medium': 'Средний',
            'high': 'Высокий'
        };
        return priorities[priority] || 'Средний';
    }
    
    getProjectText(project) {
        const projects = {
            'work': 'Работа',
            'personal': 'Личное',
            'study': 'Учеба',
            'health': 'Здоровье'
        };
        return projects[project] || 'Личное';
    }
    
    formatTimer(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Sidebar functions
    initSidebar() {
        this.renderAssignees();
        this.renderQuickFilters();
        this.renderUrgentTasks();
        this.loadQuickNotes();
        this.updateSidebarStats();
    }
    
    renderAssignees() {
        const assignees = {};
        this.tasks.forEach(task => {
            if (task.assignee) {
                assignees[task.assignee] = (assignees[task.assignee] || 0) + 1;
            }
        });
        
        const container = document.getElementById('assigneesList');
        container.innerHTML = Object.entries(assignees).map(([name, count]) => `
            <div class="assignee-item" onclick="app.filterByAssignee('${name}')">
                <div class="assignee-avatar">${name.charAt(0).toUpperCase()}</div>
                <div class="assignee-info">
                    <div class="assignee-name">${name}</div>
                    <div class="assignee-count">${count} задач</div>
                </div>
            </div>
        `).join('');
    }
    
    renderQuickFilters() {
        const allTags = new Set();
        this.tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        const container = document.getElementById('quickFilters');
        container.innerHTML = Array.from(allTags).slice(0, 8).map(tag => `
            <div class="quick-filter-tag" onclick="app.filterByTag('${tag}')">#${tag}</div>
        `).join('');
    }
    
    renderUrgentTasks() {
        const urgentTasks = this.tasks.filter(task => 
            task.status === 'active' && 
            task.priority === 'high' && 
            (!task.dateTime || new Date(task.dateTime) < new Date(Date.now() + 24 * 60 * 60 * 1000))
        ).slice(0, 5);
        
        const container = document.getElementById('urgentTasks');
        container.innerHTML = urgentTasks.map(task => `
            <div class="urgent-task-item" onclick="app.highlightTask(${task.id})">
                🔥 ${this.escapeHtml(task.title)}
            </div>
        `).join('');
    }
    
    loadQuickNotes() {
        document.getElementById('quickNotes').value = this.quickNotes;
    }
    
    saveQuickNotes(value) {
        this.quickNotes = value;
        localStorage.setItem('quickNotes', value);
    }
    
    updateSidebarStats() {
        // Update weekly progress
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekTasks = this.tasks.filter(task => 
            new Date(task.createdAt) >= weekStart
        );
        const completedWeekTasks = weekTasks.filter(t => t.status === 'completed');
        const weekProgress = weekTasks.length > 0 ? 
            Math.round((completedWeekTasks.length / weekTasks.length) * 100) : 0;
        document.getElementById('weeklyProgress').textContent = weekProgress + '%';
        
        // Update productivity score
        const todayTasks = this.tasks.filter(task => 
            new Date(task.createdAt).toDateString() === new Date().toDateString()
        );
        const completedToday = todayTasks.filter(t => t.status === 'completed').length;
        const productivityScore = Math.min(100, completedToday * 20);
        document.getElementById('productivityScore').textContent = productivityScore;
    }
    
    startClock() {
        const updateTime = () => {
            const now = new Date();
            document.getElementById('currentTime').textContent = 
                now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('currentDate').textContent = 
                now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    initChart() {
        const canvas = document.getElementById('tasksChart');
        const ctx = canvas.getContext('2d');
        
        // Simple bar chart
        const data = this.getChartData();
        const maxValue = Math.max(...data);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = 25;
        const spacing = 5;
        const startX = 20;
        const startY = canvas.height - 20;
        
        data.forEach((value, index) => {
            const barHeight = (value / maxValue) * (canvas.height - 40);
            const x = startX + index * (barWidth + spacing);
            const y = startY - barHeight;
            
            // Draw bar
            ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw value
            ctx.fillStyle = 'white';
            ctx.font = '10px Comfortaa';
            ctx.textAlign = 'center';
            ctx.fillText(value, x + barWidth/2, y - 5);
        });
    }
    
    getChartData() {
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const data = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - date.getDay() + i);
            const dayTasks = this.tasks.filter(task => 
                new Date(task.createdAt).toDateString() === date.toDateString()
            );
            data.push(dayTasks.length);
        }
        
        return data;
    }
    
    initCalendar() {
        const container = document.getElementById('miniCalendar');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let html = '<div class="calendar-grid">';
        
        // Day headers
        const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        dayHeaders.forEach(day => {
            html += `<div style="font-weight: 600; font-size: 9px;">${day}</div>`;
        });
        
        // Empty cells
        for (let i = 0; i < firstDay - 1; i++) {
            html += '<div></div>';
        }
        
        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === now.toDateString();
            const hasTasks = this.tasks.some(task => 
                task.dateTime && new Date(task.dateTime).toDateString() === date.toDateString()
            );
            
            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasTasks) classes += ' has-tasks';
            
            html += `<div class="${classes}" onclick="app.showDayTasks(${year}, ${month}, ${day})">${day}</div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    checkAchievements() {
        const achievements = [];
        
        // Check for achievements
        if (this.tasks.length >= 10) {
            achievements.push({ icon: '🎯', title: '10 задач', desc: 'Создано 10 задач' });
        }
        
        const completedCount = this.tasks.filter(t => t.status === 'completed').length;
        if (completedCount >= 5) {
            achievements.push({ icon: '⭐', title: 'Исполнитель', desc: 'Выполнено 5 задач' });
        }
        
        if (completedCount >= 20) {
            achievements.push({ icon: '🏆', title: 'Мастер', desc: 'Выполнено 20 задач' });
        }
        
        const today = new Date().toDateString();
        const todayCompleted = this.tasks.filter(t => 
            t.status === 'completed' && new Date(t.createdAt).toDateString() === today
        ).length;
        
        if (todayCompleted >= 3) {
            achievements.push({ icon: '🔥', title: 'Продуктивный день', desc: '3 задачи за день' });
        }
        
        const container = document.getElementById('achievements');
        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-desc">${achievement.desc}</div>
                </div>
            </div>
        `).join('');
    }
    
    // Sidebar actions
    quickAddTask() {
        const title = prompt('Название быстрой задачи:');
        if (title) {
            const task = {
                id: Date.now(),
                title: title,
                status: 'active',
                priority: 'medium',
                project: 'personal',
                tags: [],
                createdAt: new Date().toISOString()
            };
            
            this.tasks.unshift(task);
            this.saveTasks();
            this.render();
            this.updateStats();
            this.initSidebar();
        }
    }
    
    importTasks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedTasks = JSON.parse(event.target.result);
                        this.tasks = [...importedTasks, ...this.tasks];
                        this.saveTasks();
                        this.render();
                        this.updateStats();
                        this.initSidebar();
                        alert('Задачи успешно импортированы!');
                    } catch (error) {
                        alert('Ошибка при импорте файла');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    toggleTheme() {
        alert('Темы в разработке!');
    }
    
    toggleNotifications() {
        alert('Уведомления в разработке!');
    }
    
    filterByAssignee(assignee) {
        document.getElementById('searchInput').value = assignee;
        this.searchByAssignee(assignee);
    }
    
    filterByTag(tag) {
        document.getElementById('tagSearch').value = tag;
        this.searchByTags(tag);
    }
    
    highlightTask(taskId) {
        // Scroll to task and highlight
        const taskElement = document.querySelector(`[onclick="app.deleteTask(${taskId})"]`);
        if (taskElement) {
            taskElement.parentElement.style.background = 'rgba(255, 255, 255, 0.3)';
            taskElement.parentElement.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                taskElement.parentElement.style.background = '';
            }, 2000);
        }
    }
    
    showDayTasks(year, month, day) {
        const date = new Date(year, month, day);
        const dayTasks = this.tasks.filter(task => 
            task.dateTime && new Date(task.dateTime).toDateString() === date.toDateString()
        );
        
        if (dayTasks.length > 0) {
            alert(`Задачи на ${date.toLocaleDateString('ru-RU')}:\n\n${dayTasks.map(t => `• ${t.title}`).join('\n')}`);
        } else {
            alert(`Нет задач на ${date.toLocaleDateString('ru-RU')}`);
        }
    }
}

const app = new TodoApp();
