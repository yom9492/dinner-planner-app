class MealPlanManager {
    constructor() {
        this.meals = {};
        this.history = [];
        this.shoppingList = [];
        this.favorites = []; // お気に入り料理
        this.currentWeekOffset = 0; // 週のオフセット（0=今週、-1=先週、1=来週）
        this.draggedElement = null;
        this.currentSuggestionIndex = -1; // 候補選択用
        this.darkMode = false; // ダークモード
        this.categories = {
            '和食': ['味噌汁', '煮物', 'すき焼き', '親子丼', '天ぷら', '刺身', '焼き魚', '肉じゃが', 'カレー', '丼もの'],
            '洋食': ['パスタ', 'ピザ', 'ハンバーグ', 'ステーキ', 'サラダ', 'スープ', 'グラタン', 'リゾット', 'オムライス', 'サンドイッチ'],
            '中華': ['チャーハン', '餃子', '麻婆豆腐', '回鍋肉', '青椒肉絲', '酢豚', '炒め物', '中華スープ', '春巻き', '担々麺'],
            'その他': ['鍋', 'バーベキュー', 'お弁当', 'デリバリー', '外食']
        };
        this.mealIngredients = {
            // 料理名: [材料リスト]
            'カレー': ['牛肉', '玉ねぎ', 'じゃがいも', '人参', 'カレールー', 'ご飯'],
            'ハンバーグ': ['ひき肉', '玉ねぎ', '卵', 'パン粉', '牛乳', 'ソース'],
            'パスタ': ['パスタ', 'トマト缶', 'にんにく', 'オリーブオイル', 'チーズ'],
            '親子丼': ['鶏肉', '卵', '玉ねぎ', 'めんつゆ', 'ご飯', 'のり'],
            '麻婆豆腐': ['豆腐', 'ひき肉', '豆板醤', 'ネギ', '味噌', 'ごま油'],
            'チャーハン': ['ご飯', '卵', 'ネギ', 'チャーシュー', '醤油', 'ごま油']
        };
        this.init();
    }

    // セキュリティ: HTMLエスケープ関数を追加
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // エラーハンドリングを追加したlocalStorage操作
    safeGetFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Failed to load ${key} from storage:`, error);
            return defaultValue;
        }
    }

    safeSetToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Failed to save ${key} to storage:`, error);
            this.showErrorMessage('データの保存に失敗しました。ブラウザの容量を確認してください。');
            return false;
        }
    }

    showErrorMessage(message) {
        // エラーメッセージ表示の改善
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 5000);
    }

    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.renderMeals();
        this.renderHistory();
        this.renderShoppingList();
        this.renderFavorites();
        this.updateWeekDates();
        this.setupDragAndDrop();
        this.initDarkMode();
        this.initSearch();
    }

    bindEvents() {
        const clearAllBtn = document.getElementById('clear-all-btn');
        const savePlanBtn = document.getElementById('save-plan-btn');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const addShoppingItemBtn = document.getElementById('add-shopping-item-btn');
        const shoppingItemInput = document.getElementById('shopping-item-input');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const prevWeekBtn = document.getElementById('prev-week-btn');
        const nextWeekBtn = document.getElementById('next-week-btn');
        const currentWeekBtn = document.getElementById('current-week-btn');
        const autoGenerateBtn = document.getElementById('auto-generate-btn');

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

        darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });

        prevWeekBtn.addEventListener('click', () => {
            this.changeWeek(-1);
        });

        nextWeekBtn.addEventListener('click', () => {
            this.changeWeek(1);
        });

        currentWeekBtn.addEventListener('click', () => {
            this.goToCurrentWeek();
        });

        autoGenerateBtn.addEventListener('click', () => {
            this.autoGenerateIngredients();
        });

        // 全体的なキーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveMealPlan();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportToCSV();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleDarkMode();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.changeWeek(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.changeWeek(1);
                        break;
                }
            }
        });
    }

    startEdit(day, mealType) {
        const mealContent = document.getElementById(`${day}-${mealType}`);
        const currentMeal = this.meals[`${day}-${mealType}`] || '';
        
        // セキュリティ: HTMLエスケープ
        const escapedMeal = this.escapeHtml(currentMeal);
        
        mealContent.innerHTML = `
            <div class="edit-container">
                <input type="text" 
                       class="inline-edit" 
                       value="${escapedMeal}" 
                       placeholder="料理名を入力" 
                       aria-label="${day}の夕食を入力"
                       autocomplete="off"
                       autofocus>
                <div class="suggestions" 
                     id="suggestions-${day}-${mealType}" 
                     role="listbox" 
                     aria-label="料理の候補"></div>
            </div>
        `;
        
        const input = mealContent.querySelector('.inline-edit');
        input.focus();
        input.select();

        // イベントリスナーの追加（改善）
        let timeoutId;
        
        input.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.showSuggestions(e.target, day, mealType);
            }, 150); // デバウンス処理
        });

        input.addEventListener('blur', (e) => {
            // 候補選択時のぼかしを遅延処理
            setTimeout(() => {
                this.saveEdit(day, mealType, e.target.value);
            }, 200);
        });

        input.addEventListener('keydown', (e) => {
            this.handleSuggestionKeyboard(e, day, mealType);
        });
    }

    // 候補選択のキーボード操作を改善
    handleSuggestionKeyboard(e, day, mealType) {
        const suggestionContainer = document.getElementById(`suggestions-${day}-${mealType}`);
        const suggestions = suggestionContainer.querySelectorAll('.suggestion-item');
        
        if (suggestions.length === 0) return;

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestions.length - 1);
                this.updateSuggestionSelection(suggestions);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
                this.updateSuggestionSelection(suggestions);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.currentSuggestionIndex >= 0) {
                    const selectedSuggestion = suggestions[this.currentSuggestionIndex];
                    this.selectSuggestion(selectedSuggestion.textContent, day, mealType);
                } else {
                    e.target.blur();
                }
                break;
            case 'Escape':
                this.currentSuggestionIndex = -1;
                suggestionContainer.innerHTML = '';
                break;
        }
    }

    updateSuggestionSelection(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('selected', index === this.currentSuggestionIndex);
            if (index === this.currentSuggestionIndex) {
                suggestion.setAttribute('aria-selected', 'true');
            } else {
                suggestion.removeAttribute('aria-selected');
            }
        });
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
        if (confirm('すべての夕食を削除しますか？')) {
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
            const isFavorite = this.favorites.includes(mealName);
            
            // セキュリティ: HTMLエスケープ
            const escapedMealName = this.escapeHtml(mealName);
            const escapedCategory = this.escapeHtml(category);
            
            mealContent.innerHTML = `
                <div class="meal-item" 
                     draggable="true" 
                     data-day="${day}" 
                     data-meal="${mealType}" 
                     data-name="${escapedMealName}" 
                     style="background: ${categoryColor}"
                     tabindex="0"
                     role="button"
                     aria-label="${escapedMealName}、${escapedCategory}">
                    <div class="meal-header">
                        <span class="meal-name">${escapedMealName}</span>
                        <div class="meal-actions">
                            <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                                    onclick="event.stopPropagation(); mealManager.toggleFavorite('${escapedMealName}')" 
                                    title="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}"
                                    aria-label="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
                                ${isFavorite ? '⭐' : '☆'}
                            </button>
                            <button class="delete-btn" 
                                    onclick="event.stopPropagation(); mealManager.deleteMeal('${day}', '${mealType}')" 
                                    title="削除"
                                    aria-label="${escapedMealName}を削除">×</button>
                        </div>
                    </div>
                    <span class="meal-category">${escapedCategory}</span>
                </div>
            `;
        } else {
            mealContent.innerHTML = `
                <div class="empty-slot" 
                     tabindex="0" 
                     role="button" 
                     aria-label="クリックして${day}の夕食を入力">
                    <span class="empty-text">クリックして入力</span>
                    <span class="empty-hint">料理名を入力してください</span>
                </div>
            `;
        }
    }

    toggleFavorite(mealName) {
        if (this.favorites.includes(mealName)) {
            this.removeFromFavorites(mealName);
        } else {
            this.addToFavorites(mealName);
        }
        this.renderMeals(); // UI更新
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
        // 旧形式との互換性を保ちつつ、週別保存に移行
        this.safeSetToStorage('mealPlan', this.meals);
        this.saveMealsForCurrentWeek();
    }

    saveHistoryToStorage() {
        this.safeSetToStorage('mealPlanHistory', this.history);
    }

    saveShoppingToStorage() {
        this.safeSetToStorage('shoppingList', this.shoppingList);
    }

    addShoppingItem() {
        const input = document.getElementById('shopping-item-input');
        const itemText = input.value.trim();
        
        if (itemText && itemText.length > 0) {
            const newItem = {
                id: Date.now(),
                text: itemText,
                completed: false,
                createdAt: new Date().toISOString() // 作成日時を追加
            };
            
            this.shoppingList.push(newItem);
            this.saveShoppingToStorage();
            this.renderShoppingList();
            input.value = '';
            input.focus(); // フォーカスを戻す
        }
    }

    toggleShoppingItem(itemId) {
        const item = this.shoppingList.find(item => item.id === itemId);
        if (item) {
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
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
        
        // セキュリティ: HTMLエスケープ
        const listHTML = this.shoppingList.map(item => {
            const escapedText = this.escapeHtml(item.text);
            return `
                <li class="shopping-item ${item.completed ? 'completed' : ''}"
                    role="listitem">
                    <label class="shopping-checkbox">
                        <input type="checkbox" 
                               ${item.completed ? 'checked' : ''} 
                               onchange="mealManager.toggleShoppingItem(${item.id})"
                               aria-label="${escapedText}を${item.completed ? '未完了に' : '完了に'}する">
                        <span class="checkmark"></span>
                    </label>
                    <span class="shopping-text">${escapedText}</span>
                    <button class="delete-shopping-btn" 
                            onclick="mealManager.deleteShoppingItem(${item.id})" 
                            title="削除"
                            aria-label="${escapedText}を削除">×</button>
                </li>
            `;
        }).join('');
        
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
        
        // セキュリティ: HTMLエスケープ
        const historyHTML = this.history.map(plan => {
            const mealEntries = Object.entries(plan.meals);
            const mealSummary = mealEntries.slice(0, 3).map(([key, value]) => {
                const dayName = this.getDayName(key.split('-')[0]);
                const escapedValue = this.escapeHtml(value);
                return `${dayName}: ${escapedValue}`;
            }).join('、');
            
            const moreMeals = mealEntries.length > 3 ? '...' : '';
            const escapedDate = this.escapeHtml(plan.date);
            
            return `
                <div class="history-item" 
                     role="group" 
                     aria-label="${escapedDate}の献立">
                    <div class="history-header">
                        <span class="history-date">${escapedDate}</span>
                        <div class="history-actions">
                            <button class="load-btn" 
                                    onclick="mealManager.loadPlan(${plan.id})" 
                                    title="読み込み"
                                    aria-label="${escapedDate}の献立を読み込み">読み込み</button>
                            <button class="delete-history-btn" 
                                    onclick="mealManager.deletePlan(${plan.id})" 
                                    title="削除"
                                    aria-label="${escapedDate}の献立を削除">×</button>
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
        const monday = this.getMondayOfWeek(today, this.currentWeekOffset);
        
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
            
            let weekLabel = `${startMonth}/${startDate} - ${endMonth}/${endDate}`;
            
            if (this.currentWeekOffset === 0) {
                weekLabel += ' (今週)';
            } else if (this.currentWeekOffset === -1) {
                weekLabel += ' (先週)';
            } else if (this.currentWeekOffset === 1) {
                weekLabel += ' (来週)';
            } else if (this.currentWeekOffset < 0) {
                weekLabel += ` (${Math.abs(this.currentWeekOffset)}週間前)`;
            } else {
                weekLabel += ` (${this.currentWeekOffset}週間後)`;
            }
            
            weekDatesElement.textContent = weekLabel;
        }

        // ナビゲーションボタンの状態更新
        const currentWeekBtn = document.getElementById('current-week-btn');
        if (currentWeekBtn) {
            currentWeekBtn.style.display = this.currentWeekOffset === 0 ? 'none' : 'inline-block';
        }
    }

    loadFromStorage() {
        // エラーハンドリングを追加
        this.meals = this.safeGetFromStorage('mealPlan', {});
        this.history = this.safeGetFromStorage('mealPlanHistory', []);
        this.shoppingList = this.safeGetFromStorage('shoppingList', []);
        this.favorites = this.safeGetFromStorage('favorites', []);
        
        // データの整合性チェック
        if (!Array.isArray(this.history)) {
            this.history = [];
        }
        if (!Array.isArray(this.shoppingList)) {
            this.shoppingList = [];
        }
        if (typeof this.meals !== 'object' || this.meals === null) {
            this.meals = {};
        }
        if (typeof this.favorites !== 'object' || this.favorites === null) {
            this.favorites = [];
        }
    }

    setupDragAndDrop() {
        // 重複を避けるためイベントリスナーを一度だけ追加
        if (this.dragAndDropInitialized) return;
        this.dragAndDropInitialized = true;

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('meal-item')) {
                this.draggedElement = e.target;
                e.target.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('meal-item')) {
                e.target.style.opacity = '1';
                this.draggedElement = null;
                
                // 全てのドロップゾーンのハイライトを削除
                document.querySelectorAll('.meal-slot').forEach(slot => {
                    slot.style.backgroundColor = '';
                    slot.classList.remove('drag-over');
                });
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const targetSlot = e.target.closest('.meal-slot');
            if (targetSlot && this.draggedElement) {
                targetSlot.style.backgroundColor = '#e3f2fd';
                targetSlot.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const targetSlot = e.target.closest('.meal-slot');
            if (targetSlot && !targetSlot.contains(e.relatedTarget)) {
                targetSlot.style.backgroundColor = '';
                targetSlot.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSlot = e.target.closest('.meal-slot');
            
            if (targetSlot && this.draggedElement) {
                targetSlot.style.backgroundColor = '';
                targetSlot.classList.remove('drag-over');
                
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
                    
                    // アクセシビリティ: 変更をアナウンス
                    this.announceChange(`${draggedMealName}を${targetDay}に移動しました`);
                }
            }
        });

        // キーボードでのドラッグ&ドロップ代替
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('meal-item') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.startKeyboardMove(e.target);
            }
        });
    }

    // アクセシビリティ: 変更をスクリーンリーダーにアナウンス
    announceChange(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // キーボードでの移動開始
    startKeyboardMove(mealElement) {
        // 実装は複雑になるため、シンプルな確認ダイアログで代用
        const mealName = mealElement.dataset.name;
        const currentDay = mealElement.closest('.day-column').dataset.day;
        
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
        
        const options = days.filter(day => day !== currentDay)
                           .map(day => `${dayNames[day]}: ${day}`)
                           .join('\n');
        
        const targetDay = prompt(`${mealName}をどの曜日に移動しますか？\n\n${options}\n\n曜日の英語名を入力してください:`);
        
        if (targetDay && days.includes(targetDay) && targetDay !== currentDay) {
            const sourceMealKey = `${currentDay}-dinner`;
            const targetMealKey = `${targetDay}-dinner`;
            const existingTargetMeal = this.meals[targetMealKey];
            
            this.meals[targetMealKey] = mealName;
            
            if (existingTargetMeal) {
                this.meals[sourceMealKey] = existingTargetMeal;
            } else {
                delete this.meals[sourceMealKey];
            }
            
            this.saveToStorage();
            this.renderMeals();
            this.announceChange(`${mealName}を${dayNames[targetDay]}に移動しました`);
        }
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
        
        // リセット
        this.currentSuggestionIndex = -1;
        
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

        // セキュリティ: HTMLエスケープ + アクセシビリティ改善
        const suggestionsHTML = allSuggestions.slice(0, 5).map((suggestion, index) => {
            const escapedSuggestion = this.escapeHtml(suggestion);
            return `<div class="suggestion-item" 
                         onclick="mealManager.selectSuggestion('${escapedSuggestion}', '${day}', '${mealType}')"
                         role="option"
                         tabindex="-1"
                         aria-selected="false"
                         data-index="${index}">${escapedSuggestion}</div>`;
        }).join('');

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

    // 週切り替え機能
    changeWeek(direction) {
        this.currentWeekOffset += direction;
        this.updateWeekDates();
        this.loadMealsForCurrentWeek();
        this.renderMeals();
        
        const action = direction > 0 ? '次週' : '先週';
        this.showSuccessMessage(`${action}に切り替えました`);
    }

    goToCurrentWeek() {
        this.currentWeekOffset = 0;
        this.updateWeekDates();
        this.loadMealsForCurrentWeek();
        this.renderMeals();
        this.showSuccessMessage('今週に戻りました');
    }

    getWeekKey() {
        const today = new Date();
        const monday = this.getMondayOfWeek(today, this.currentWeekOffset);
        return `week-${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
    }

    getMondayOfWeek(date, weekOffset = 0) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setDate(monday.getDate() + (weekOffset * 7));
        return monday;
    }

    loadMealsForCurrentWeek() {
        const weekKey = this.getWeekKey();
        const weekData = this.safeGetFromStorage(`meals-${weekKey}`, {});
        this.meals = weekData;
    }

    saveMealsForCurrentWeek() {
        const weekKey = this.getWeekKey();
        this.safeSetToStorage(`meals-${weekKey}`, this.meals);
    }

    // ダークモード機能
    initDarkMode() {
        this.darkMode = this.safeGetFromStorage('darkMode', false);
        this.applyDarkMode();
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.safeSetToStorage('darkMode', this.darkMode);
        this.applyDarkMode();
        
        const message = this.darkMode ? 'ダークモードを有効にしました' : 'ライトモードに戻しました';
        this.showSuccessMessage(message);
    }

    applyDarkMode() {
        document.body.classList.toggle('dark-mode', this.darkMode);
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.darkMode ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', this.darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
        }
    }

    // お気に入り料理機能
    addToFavorites(mealName) {
        if (!this.favorites.includes(mealName)) {
            this.favorites.push(mealName);
            this.safeSetToStorage('favorites', this.favorites);
            this.renderFavorites();
            this.showSuccessMessage(`${mealName}をお気に入りに追加しました`);
        }
    }

    removeFromFavorites(mealName) {
        this.favorites = this.favorites.filter(fav => fav !== mealName);
        this.safeSetToStorage('favorites', this.favorites);
        this.renderFavorites();
        this.showSuccessMessage(`${mealName}をお気に入りから削除しました`);
    }

    renderFavorites() {
        const favoritesContainer = document.getElementById('favorites-list');
        if (!favoritesContainer) return;

        if (this.favorites.length === 0) {
            favoritesContainer.innerHTML = '<div class="no-favorites">お気に入りの料理はありません</div>';
            return;
        }

        const favoritesHTML = this.favorites.map(meal => {
            const escapedMeal = this.escapeHtml(meal);
            return `
                <div class="favorite-item" 
                     onclick="mealManager.addMealFromFavorite('${escapedMeal}')"
                     title="クリックして献立に追加">
                    <span class="favorite-name">${escapedMeal}</span>
                    <button class="remove-favorite-btn" 
                            onclick="event.stopPropagation(); mealManager.removeFromFavorites('${escapedMeal}')"
                            aria-label="${escapedMeal}をお気に入りから削除">×</button>
                </div>
            `;
        }).join('');

        favoritesContainer.innerHTML = favoritesHTML;
    }

    addMealFromFavorite(mealName) {
        // 空いている曜日を探して追加
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        for (const day of days) {
            const mealKey = `${day}-dinner`;
            if (!this.meals[mealKey]) {
                this.meals[mealKey] = mealName;
                this.saveToStorage();
                this.renderMeals();
                this.showSuccessMessage(`${mealName}を${this.getDayName(day)}曜日に追加しました`);
                return;
            }
        }
        
        this.showErrorMessage('すべての曜日に料理が設定されています');
    }

    // 材料自動生成機能
    autoGenerateIngredients() {
        const currentMeals = Object.values(this.meals);
        const ingredients = new Set();

        currentMeals.forEach(meal => {
            if (this.mealIngredients[meal]) {
                this.mealIngredients[meal].forEach(ingredient => {
                    ingredients.add(ingredient);
                });
            }
        });

        if (ingredients.size === 0) {
            this.showErrorMessage('献立から材料を生成できませんでした');
            return;
        }

        // 既存の買い物リストに追加（重複チェック）
        let addedCount = 0;
        ingredients.forEach(ingredient => {
            const exists = this.shoppingList.some(item => 
                item.text.toLowerCase() === ingredient.toLowerCase()
            );
            
            if (!exists) {
                const newItem = {
                    id: Date.now() + Math.random(),
                    text: ingredient,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    autoGenerated: true
                };
                this.shoppingList.push(newItem);
                addedCount++;
            }
        });

        this.saveShoppingToStorage();
        this.renderShoppingList();
        
        if (addedCount > 0) {
            this.showSuccessMessage(`${addedCount}個の材料を買い物リストに追加しました`);
        } else {
            this.showSuccessMessage('必要な材料はすでに買い物リストにあります');
        }
    }

    // 検索機能
    initSearch() {
        const searchInput = document.getElementById('meal-search');
        if (!searchInput) return;

        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this.clearSearch();
            }
        });
    }

    performSearch(query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (!query.trim()) {
            this.clearSearch();
            return;
        }

        const allMeals = new Set();
        Object.values(this.categories).flat().forEach(meal => allMeals.add(meal));
        this.favorites.forEach(meal => allMeals.add(meal));

        const results = Array.from(allMeals).filter(meal =>
            meal.toLowerCase().includes(query.toLowerCase())
        );

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">検索結果が見つかりません</div>';
            searchResults.style.display = 'block';
            return;
        }

        const resultsHTML = results.slice(0, 8).map(meal => {
            const escapedMeal = this.escapeHtml(meal);
            const isFavorite = this.favorites.includes(meal);
            const category = this.getMealCategory(meal);
            
            return `
                <div class="search-result-item" 
                     onclick="mealManager.addMealFromSearch('${escapedMeal}')"
                     title="クリックして献立に追加">
                    <span class="search-meal-name">${escapedMeal}</span>
                    <span class="search-meal-category">${category}</span>
                    ${isFavorite ? '<span class="favorite-star">⭐</span>' : ''}
                </div>
            `;
        }).join('');

        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';
    }

    addMealFromSearch(mealName) {
        this.addMealFromFavorite(mealName); // 同じロジックを使用
        this.clearSearch();
        
        // 検索入力をクリア
        const searchInput = document.getElementById('meal-search');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    clearSearch() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
        }
    }

    getMealCategory(mealName) {
        for (const [category, meals] of Object.entries(this.categories)) {
            if (meals.includes(mealName)) {
                return category;
            }
        }
        return 'その他';
    }

    getDayName(dayCode) {
        const dayNames = {
            'monday': '月',
            'tuesday': '火',
            'wednesday': '水',
            'thursday': '木',
            'friday': '金',
            'saturday': '土',
            'sunday': '日'
        };
        return dayNames[dayCode] || dayCode;
    }
}

// グローバルインスタンス作成
let mealManager;

document.addEventListener('DOMContentLoaded', () => {
    mealManager = new MealPlanManager();
});