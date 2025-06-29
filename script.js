class MealPlanManager {
    constructor() {
        this.meals = {};
        this.history = [];
        this.shoppingList = [];
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.renderMeals();
        this.renderHistory();
        this.renderShoppingList();
        this.updateWeekDates();
    }

    bindEvents() {
        const clearAllBtn = document.getElementById('clear-all-btn');
        const savePlanBtn = document.getElementById('save-plan-btn');
        const addShoppingItemBtn = document.getElementById('add-shopping-item-btn');
        const shoppingItemInput = document.getElementById('shopping-item-input');

        clearAllBtn.addEventListener('click', () => {
            this.clearAllMeals();
        });

        savePlanBtn.addEventListener('click', () => {
            this.saveMealPlan();
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
            <input type="text" class="inline-edit" value="${currentMeal}" 
                   placeholder="料理名を入力" 
                   onblur="mealManager.saveEdit('${day}', '${mealType}', this.value)"
                   onkeypress="if(event.key==='Enter') this.blur()"
                   autofocus>
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
            mealContent.innerHTML = `
                <div class="meal-item">
                    <span class="meal-name">${mealName}</span>
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
}

const mealManager = new MealPlanManager();