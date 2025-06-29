class MealPlanManager {
    constructor() {
        this.meals = {};
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.renderMeals();
    }

    bindEvents() {
        const clearAllBtn = document.getElementById('clear-all-btn');

        clearAllBtn.addEventListener('click', () => {
            this.clearAllMeals();
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

    loadFromStorage() {
        const stored = localStorage.getItem('mealPlan');
        if (stored) {
            this.meals = JSON.parse(stored);
        }
    }
}

const mealManager = new MealPlanManager();