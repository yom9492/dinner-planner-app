class MealPlanManager {
    constructor() {
        this.meals = {};
        this.history = [];
        this.shoppingList = [];
        this.draggedElement = null;
        this.categories = {
            '和食': ['味噌汁', '煮物', 'すき焼き', '親子丼', '天ぷら', '刺身', '焼き魚', '肉じゃが', 'カレー', '丼もの'],
            '洋食': ['パスタ', 'ピザ', 'ハンバーグ', 'ステーキ', 'サラダ', 'スープ', 'グラタン', 'リゾット', 'オムライス', 'サンドイッチ'],
            '中華': ['チャーハン', '餃子', '麻婆豆腐', '回鍋肉', '青椒肉絲', '酢豚', '炒め物', '中華スープ', '春巻き', '担々麺'],
            'その他': ['鍋', 'バーベキュー', 'お弁当', 'デリバリー', '外食']
        };
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.renderMeals();
        this.renderHistory();
        this.renderShoppingList();
        this.updateWeekDates();
        this.setupDragAndDrop();
    }

    bindEvents() {
        const clearAllBtn = document.getElementById('clear-all-btn');
        const savePlanBtn = document.getElementById('save-plan-btn');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const addShoppingItemBtn = document.getElementById('add-shopping-item-btn');
        const shoppingItemInput = document.getElementById('shopping-item-input');

        clearAllBtn.addEventListener('click', () => {
            this.clearAllMeals();
        });

        savePlanBtn.addEventListener('click', () => {
            this.saveMealPlan();
        });

        exportCsvBtn.addEventListener('click', () => {
            this.exportToCSV();
        });

        addShoppingItemBtn.addEventListener('click', () => {
            this.addShoppingItem();
        });

        shoppingItemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addShoppingItem();
            }
        });
    }

    startEdit(day, mealType) {
        const mealContent = document.getElementById(`${day}-${mealType}`);
        const currentMeal = this.meals[`${day}-${mealType}`] || '';
        
        mealContent.innerHTML = `
            <div class="edit-container">
                <input type="text" class="inline-edit" value="${currentMeal}" 
                       placeholder="料理名を入力" 
                       onblur="mealManager.saveEdit('${day}', '${mealType}', this.value)"
                       onkeypress="if(event.key==='Enter') this.blur()"
                       oninput="mealManager.showSuggestions(this, '${day}', '${mealType}')"
                       autofocus>
                <div class="suggestions" id="suggestions-${day}-${mealType}"></div>
            </div>
        `;
        
        const input = mealContent.querySelector('.inline-edit');
        input.focus();
        input.select();
    }
    
    saveEdit(day, mealType, value) {
        const mealName = value.trim();
        const mealKey = `${day}-${mealType}`;
        
        if (mealName) {
            this.meals[mealKey] = mealName;
        } else {
            delete this.meals[mealKey];
        }
        
        this.saveToStorage();
        this.renderMeal(day, mealType, mealName || null);
    }

    deleteMeal(day, mealType) {
        const mealKey = `${day}-${mealType}`;
        delete this.meals[mealKey];
        this.saveToStorage();
        this.renderMeal(day, mealType, null);
    }

    clearAllMeals() {
        if (confirm('全ての夕食を削除しますか？')) {
            this.meals = {};
            this.saveToStorage();
            this.renderMeals();
        }
    }

    renderMeal(day, mealType, mealName) {
        const mealContent = document.getElementById(`${day}-${mealType}`);
        
        if (mealName) {
            const category = this.getMealCategory(mealName);
            const categoryColor = this.getCategoryColor(category);
            
            mealContent.innerHTML = `
                <div class="meal-item" draggable="true" data-day="${day}" data-meal="${mealType}" data-name="${mealName}" style="background: ${categoryColor}">
                    <span class="meal-name">${mealName}</span>
                    <span class="meal-category">${category}</span>
                    <button class="delete-btn" onclick="mealManager.deleteMeal('${day}', '${mealType}')" title="削除">×</button>
                </div>
            `;
        } else {
            mealContent.innerHTML = '<div class="empty-slot">クリックして入力</div>';
        }
    }

    renderMeals() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const mealType = 'dinner';

        days.forEach(day => {
            const mealKey = `${day}-${mealType}`;
            const mealName = this.meals[mealKey];
            this.renderMeal(day, mealType, mealName);
        });
    }

    saveToStorage() {
        localStorage.setItem('mealPlan', JSON.stringify(this.meals));
    }

    saveHistoryToStorage() {
        localStorage.setItem('mealPlanHistory', JSON.stringify(this.history));
    }

    saveShoppingToStorage() {
        localStorage.setItem('shoppingList', JSON.stringify(this.shoppingList));
    }

    addShoppingItem() {
        const input = document.getElementById('shopping-item-input');
        const itemText = input.value.trim();
        
        if (itemText && itemText.length > 0) {
            const newItem = {
                id: Date.now(),
                text: itemText,
                completed: false
            };
            
            this.shoppingList.push(newItem);
            this.saveShoppingToStorage();
            this.renderShoppingList();
            input.value = '';
        }
    }

    toggleShoppingItem(itemId) {
        const item = this.shoppingList.find(item => item.id === itemId);
        if (item) {
            item.completed = !item.completed;
            this.saveShoppingToStorage();
            this.renderShoppingList();
        }
    }

    deleteShoppingItem(itemId) {
        this.shoppingList = this.shoppingList.filter(item => item.id !== itemId);
        this.saveShoppingToStorage();
        this.renderShoppingList();
    }

    renderShoppingList() {
        const shoppingList = document.getElementById('shopping-list');
        
        if (this.shoppingList.length === 0) {
            shoppingList.innerHTML = '<li class="no-items">買い物リストは空です</li>';
            return;
        }
        
        const listHTML = this.shoppingList.map(item => `
            <li class="shopping-item ${item.completed ? 'completed' : ''}">
                <label class="shopping-checkbox">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} 
                           onchange="mealManager.toggleShoppingItem(${item.id})">
                    <span class="checkmark"></span>
                </label>
                <span class="shopping-text">${item.text}</span>
                <button class="delete-shopping-btn" 
                        onclick="mealManager.deleteShoppingItem(${item.id})" 
                        title="削除">×</button>
            </li>
        `).join('');
        
        shoppingList.innerHTML = listHTML;
    }

    saveMealPlan() {
        const currentMeals = { ...this.meals };
        const isEmpty = Object.keys(currentMeals).length === 0;
        
        if (isEmpty) {
            alert('保存する献立がありません。');
            return;
        }
        
        const now = new Date();
        const planData = {
            id: Date.now(),
            date: now.toLocaleDateString('ja-JP'),
            meals: currentMeals,
            createdAt: now.toISOString()
        };
        
        this.history.unshift(planData);
        
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        this.saveHistoryToStorage();
        this.renderHistory();
        
        alert('献立を保存しました！');
    }

    deletePlan(planId) {
        if (confirm('この献立を削除しますか？')) {
            this.history = this.history.filter(plan => plan.id !== planId);
            this.saveHistoryToStorage();
            this.renderHistory();
        }
    }

    loadPlan(planId) {
        const plan = this.history.find(p => p.id === planId);
        if (plan) {
            if (Object.keys(this.meals).length > 0) {
                if (!confirm('現在の献立が上書きされます。よろしいですか？')) {
                    return;
                }
            }
            this.meals = { ...plan.meals };
            this.saveToStorage();
            this.renderMeals();
        }
    }

    renderHistory() {
        const historyList = document.getElementById('history-list');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="no-history">保存された献立はありません</div>';
            return;
        }
        
        const historyHTML = this.history.map(plan => {
            const mealEntries = Object.entries(plan.meals);
            const mealSummary = mealEntries.slice(0, 3).map(([key, value]) => {
                const dayName = this.getDayName(key.split('-')[0]);
                return `${dayName}: ${value}`;
            }).join('、');
            
            const moreMeals = mealEntries.length > 3 ? '...' : '';
            
            return `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${plan.date}</span>
                        <div class="history-actions">
                            <button class="load-btn" onclick="mealManager.loadPlan(${plan.id})" title="読み込み">読み込み</button>
                            <button class="delete-history-btn" onclick="mealManager.deletePlan(${plan.id})" title="削除">×</button>
                        </div>
                    </div>
                    <div class="history-content">
                        ${mealSummary}${moreMeals}
                    </div>
                </div>
            `;
        }).join('');
        
        historyList.innerHTML = historyHTML;
    }

    getDayName(dayKey) {
        const dayNames = {
            'monday': '月',
            'tuesday': '火',
            'wednesday': '水',
            'thursday': '木',
            'friday': '金',
            'saturday': '土',
            'sunday': '日'
        };
        return dayNames[dayKey] || dayKey;
    }

    updateWeekDates() {
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        
        // 月曜日を基準にする（日曜日は0、月曜日は1）
        const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        monday.setDate(today.getDate() + daysToMonday);
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach((day, index) => {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + index);
            
            const dateElement = document.getElementById(`${day}-date`);
            if (dateElement) {
                const month = currentDate.getMonth() + 1;
                const date = currentDate.getDate();
                const isToday = currentDate.toDateString() === today.toDateString();
                
                dateElement.textContent = `${month}/${date}`;
                dateElement.className = isToday ? 'date-info today' : 'date-info';
            }
        });
        
        // 週の期間を表示
        const weekDatesElement = document.getElementById('week-dates');
        if (weekDatesElement) {
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            const startMonth = monday.getMonth() + 1;
            const startDate = monday.getDate();
            const endMonth = sunday.getMonth() + 1;
            const endDate = sunday.getDate();
            
            weekDatesElement.textContent = `${startMonth}/${startDate} - ${endMonth}/${endDate}`;
        }
    }

    loadFromStorage() {
        const stored = localStorage.getItem('mealPlan');
        if (stored) {
            this.meals = JSON.parse(stored);
        }
        
        const storedHistory = localStorage.getItem('mealPlanHistory');
        if (storedHistory) {
            this.history = JSON.parse(storedHistory);
        }
        
        const storedShopping = localStorage.getItem('shoppingList');
        if (storedShopping) {
            this.shoppingList = JSON.parse(storedShopping);
        }
    }

    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('meal-item')) {
                this.draggedElement = e.target;
                e.target.style.opacity = '0.5';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('meal-item')) {
                e.target.style.opacity = '1';
                this.draggedElement = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.target.closest('.meal-slot')) {
                e.target.closest('.meal-slot').style.backgroundColor = '#e3f2fd';
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.closest('.meal-slot')) {
                e.target.closest('.meal-slot').style.backgroundColor = '';
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSlot = e.target.closest('.meal-slot');
            
            if (targetSlot && this.draggedElement) {
                targetSlot.style.backgroundColor = '';
                
                const sourceMealSlot = this.draggedElement.closest('.meal-slot');
                const sourceDay = sourceMealSlot.closest('.day-column').dataset.day;
                const sourceMealType = sourceMealSlot.dataset.meal;
                
                const targetDay = targetSlot.closest('.day-column').dataset.day;
                const targetMealType = targetSlot.dataset.meal;
                
                if (sourceDay !== targetDay || sourceMealType !== targetMealType) {
                    const draggedMealName = this.draggedElement.dataset.name;
                    
                    const targetMealKey = `${targetDay}-${targetMealType}`;
                    const sourceMealKey = `${sourceDay}-${sourceMealType}`;
                    
                    const existingTargetMeal = this.meals[targetMealKey];
                    
                    this.meals[targetMealKey] = draggedMealName;
                    
                    if (existingTargetMeal) {
                        this.meals[sourceMealKey] = existingTargetMeal;
                    } else {
                        delete this.meals[sourceMealKey];
                    }
                    
                    this.saveToStorage();
                    this.renderMeals();
                }
            }
        });
    }

    exportToCSV() {
        const isEmpty = Object.keys(this.meals).length === 0;
        
        if (isEmpty) {
            alert('エクスポートする献立がありません。');
            return;
        }

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = {
            'monday': '月曜日',
            'tuesday': '火曜日',
            'wednesday': '水曜日',
            'thursday': '木曜日',
            'friday': '金曜日',
            'saturday': '土曜日',
            'sunday': '日曜日'
        };

        let csvContent = "曜日,夕食\n";
        
        days.forEach(day => {
            const mealKey = `${day}-dinner`;
            const mealName = this.meals[mealKey] || '';
            csvContent += `${dayNames[day]},${mealName}\n`;
        });

        if (this.shoppingList.length > 0) {
            csvContent += "\n買い物リスト\n";
            this.shoppingList.forEach(item => {
                const status = item.completed ? '完了' : '未完了';
                csvContent += `${item.text},${status}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const today = new Date();
        const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        link.setAttribute('download', `献立_${dateString}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('献立をCSVファイルとしてエクスポートしました！');
    }

    showSuggestions(input, day, mealType) {
        const value = input.value.toLowerCase();
        const suggestionContainer = document.getElementById(`suggestions-${day}-${mealType}`);
        
        if (value.length < 1) {
            suggestionContainer.innerHTML = '';
            return;
        }

        const allSuggestions = [];
        Object.values(this.categories).flat().forEach(meal => {
            if (meal.toLowerCase().includes(value)) {
                allSuggestions.push(meal);
            }
        });

        if (allSuggestions.length === 0) {
            suggestionContainer.innerHTML = '';
            return;
        }

        const suggestionsHTML = allSuggestions.slice(0, 5).map(suggestion => 
            `<div class="suggestion-item" onclick="mealManager.selectSuggestion('${suggestion}', '${day}', '${mealType}')">${suggestion}</div>`
        ).join('');

        suggestionContainer.innerHTML = suggestionsHTML;
    }

    selectSuggestion(suggestion, day, mealType) {
        const input = document.querySelector(`#${day}-${mealType} .inline-edit`);
        input.value = suggestion;
        input.blur();
    }

    getMealCategory(mealName) {
        for (const [category, meals] of Object.entries(this.categories)) {
            if (meals.some(meal => meal.toLowerCase().includes(mealName.toLowerCase()) || mealName.toLowerCase().includes(meal.toLowerCase()))) {
                return category;
            }
        }
        return 'その他';
    }

    getCategoryColor(category) {
        const colors = {
            '和食': 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            '洋食': 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            '中華': 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            'その他': 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)'
        };
        return colors[category] || colors['その他'];
    }
}

const mealManager = new MealPlanManager();