/**
 * Wellness & Vodka Tracker
 * A simple vanilla JS app for tracking your daily wellness metrics and vodka consumption.
 */

// Storage key
const STORAGE_KEY = 'wellness-vodka-data';

// App state
let entries = [];
let currentEntry = {
    date: new Date().toISOString().split('T')[0],
    mood: null,
    energy: null,
    sleep: null,
    water: 0,
    exercise: null,
    vodkaShots: 0,
    vodkaType: '',
    mixer: null,
    citrus: {},
    vitaminC: false,
    notes: ''
};

// Recipe data
const recipes = [
    {
        name: 'Vodka Soda',
        emoji: '🥤',
        badge: 'healthy',
        ingredients: ['2 oz vodka', 'Club soda', 'Lime wedge', 'Ice'],
        instructions: 'Fill glass with ice, add vodka, top with club soda. Squeeze and drop in lime.',
        wellness: ['Low calorie', 'No sugar', 'Hydrating']
    },
    {
        name: 'Cucumber Cooler',
        emoji: '🥒',
        badge: 'healthy',
        ingredients: ['2 oz vodka', '4 cucumber slices', 'Fresh mint', 'Sparkling water', 'Lime juice'],
        instructions: 'Muddle cucumber and mint. Add vodka and lime juice. Top with sparkling water and ice.',
        wellness: ['Antioxidants', 'Refreshing', 'Low calorie']
    },
    {
        name: 'Green Machine',
        emoji: '🥬',
        badge: 'healthy',
        ingredients: ['1.5 oz vodka', '2 oz fresh spinach juice', '1 oz apple juice', 'Ginger slice', 'Lemon'],
        instructions: 'Shake vodka with juices and ginger. Strain over ice. Garnish with lemon.',
        wellness: ['Vitamins A & K', 'Iron boost', 'Detoxifying']
    },
    {
        name: 'Classic Martini',
        emoji: '🍸',
        badge: 'classic',
        ingredients: ['2.5 oz vodka', '0.5 oz dry vermouth', 'Olive or lemon twist'],
        instructions: 'Stir vodka and vermouth with ice. Strain into chilled martini glass. Garnish.',
        wellness: ['Pure & simple', 'No mixers']
    },
    {
        name: 'Bloody Mary',
        emoji: '🍅',
        badge: 'healthy',
        ingredients: ['2 oz vodka', '4 oz tomato juice', 'Worcestershire', 'Hot sauce', 'Celery, lemon'],
        instructions: 'Combine all ingredients over ice. Stir well. Garnish with celery and lemon.',
        wellness: ['Lycopene', 'Vitamin C', 'Electrolytes']
    }
];

const citrusRecipes = [
    {
        name: 'Lemon Drop',
        emoji: '🍋',
        badge: 'citrus',
        ingredients: ['2 oz vodka', '1 oz fresh lemon juice', '0.5 oz simple syrup', 'Sugar rim'],
        instructions: 'Shake vodka, lemon juice, and syrup with ice. Strain into sugar-rimmed glass.',
        wellness: ['Vitamin C', 'Fresh citrus']
    },
    {
        name: 'Moscow Mule',
        emoji: '🍈',
        badge: 'citrus',
        ingredients: ['2 oz vodka', '4 oz ginger beer', '0.5 oz lime juice', 'Lime wedge'],
        instructions: 'Build in copper mug over ice. Add vodka, lime juice, top with ginger beer. Stir.',
        wellness: ['Ginger benefits', 'Lime vitamin C']
    },
    {
        name: 'Greyhound',
        emoji: '🍊',
        badge: 'citrus',
        ingredients: ['2 oz vodka', '4 oz fresh grapefruit juice', 'Salt rim (optional)'],
        instructions: 'Pour vodka over ice, top with grapefruit juice. Salt rim optional (makes it a Salty Dog).',
        wellness: ['Vitamin C', 'Antioxidants', 'Low sugar']
    },
    {
        name: 'Screwdriver',
        emoji: '🍊',
        badge: 'citrus',
        ingredients: ['2 oz vodka', '4 oz fresh orange juice', 'Orange slice'],
        instructions: 'Pour vodka over ice, add fresh orange juice. Stir. Garnish with orange slice.',
        wellness: ['Vitamin C', 'Potassium', 'Classic brunch']
    },
    {
        name: 'Citrus Spritz',
        emoji: '✨',
        badge: 'citrus',
        ingredients: ['1.5 oz vodka', '1 oz each: lemon, lime, orange juice', 'Sparkling water'],
        instructions: 'Shake vodka with citrus juices. Strain over ice. Top with sparkling water.',
        wellness: ['Triple vitamin C', 'Hydrating', 'Refreshing']
    }
];

const wellnessTips = [
    'Stay hydrated! Drink a glass of water between each vodka.',
    'Add fresh citrus to boost vitamin C while you enjoy.',
    'Eat before drinking - never drink on an empty stomach.',
    'Take a 10-minute walk after drinking to aid metabolism.',
    'Choose quality over quantity - savor fewer, better drinks.',
    'Alternate alcoholic drinks with sparkling water.',
    'Avoid sugary mixers - opt for soda water or fresh juice.',
    'Stop drinking 3 hours before bed for better sleep quality.',
    'Track your intake to stay mindful of consumption.',
    'Exercise earlier in the day if you plan to drink later.'
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeTabs();
    initializeDate();
    initializeEmojiPickers();
    initializeCounters();
    initializeMixerPicker();
    initializeCitrusPicker();
    initializeToggle();
    initializeSaveButton();
    initializeHistory();
    initializeStats();
    initializeRecipes();
    loadTodayEntry();
});

// Load data from localStorage
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        entries = JSON.parse(data);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Initialize tab navigation
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Refresh content if needed
            if (targetId === 'history') {
                renderHistory();
            } else if (targetId === 'stats') {
                updateStats(7);
            } else if (targetId === 'recipes') {
                updateRecommendation();
            }
        });
    });
}

// Initialize date display
function initializeDate() {
    const dateEl = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

// Initialize emoji pickers (mood & energy)
function initializeEmojiPickers() {
    const moodPicker = document.getElementById('mood-picker');
    const energyPicker = document.getElementById('energy-picker');

    moodPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-btn')) {
            moodPicker.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            currentEntry.mood = parseInt(e.target.dataset.value);
        }
    });

    energyPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-btn')) {
            energyPicker.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            currentEntry.energy = parseInt(e.target.dataset.value);
        }
    });
}

// Initialize counter buttons
function initializeCounters() {
    document.querySelectorAll('.counter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            let value = parseInt(input.value) || 0;

            if (btn.classList.contains('plus')) {
                value = Math.min(value + 1, parseInt(input.max) || 20);
            } else {
                value = Math.max(value - 1, 0);
            }

            input.value = value;

            // Update current entry
            if (targetId === 'water') {
                currentEntry.water = value;
            } else if (targetId === 'vodka-shots') {
                currentEntry.vodkaShots = value;
            }
        });
    });

    // Also handle manual input changes
    document.getElementById('sleep').addEventListener('change', (e) => {
        currentEntry.sleep = parseFloat(e.target.value) || null;
    });

    document.getElementById('exercise').addEventListener('change', (e) => {
        currentEntry.exercise = parseInt(e.target.value) || null;
    });

    document.getElementById('vodka-type').addEventListener('change', (e) => {
        currentEntry.vodkaType = e.target.value;
    });

    document.getElementById('notes').addEventListener('change', (e) => {
        currentEntry.notes = e.target.value;
    });
}

// Initialize mixer picker
function initializeMixerPicker() {
    const mixerPicker = document.getElementById('mixer-picker');

    mixerPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('mixer-btn')) {
            mixerPicker.querySelectorAll('.mixer-btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            currentEntry.mixer = e.target.dataset.value;
        }
    });
}

// Initialize citrus picker (multi-select with counts)
function initializeCitrusPicker() {
    const citrusPicker = document.getElementById('citrus-picker');
    const citrusCount = document.getElementById('citrus-count');

    citrusPicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.citrus-btn');
        if (btn) {
            const value = btn.dataset.value;

            // Toggle or increment count
            if (!currentEntry.citrus[value]) {
                currentEntry.citrus[value] = 1;
            } else {
                currentEntry.citrus[value]++;
            }

            // If clicked 5+ times, reset to 0
            if (currentEntry.citrus[value] > 5) {
                currentEntry.citrus[value] = 0;
            }

            updateCitrusDisplay();
        }
    });

    function updateCitrusDisplay() {
        const buttons = citrusPicker.querySelectorAll('.citrus-btn');
        buttons.forEach(btn => {
            const value = btn.dataset.value;
            const count = currentEntry.citrus[value] || 0;

            // Remove existing count badge
            const existingBadge = btn.querySelector('.count');
            if (existingBadge) existingBadge.remove();

            // Add new badge if count > 0
            if (count > 0) {
                btn.classList.add('selected');
                const badge = document.createElement('span');
                badge.className = 'count';
                badge.textContent = count;
                btn.appendChild(badge);
            } else {
                btn.classList.remove('selected');
            }
        });

        // Update summary text
        const total = Object.values(currentEntry.citrus).reduce((a, b) => a + b, 0);
        if (total > 0) {
            citrusCount.textContent = `${total} citrus serving${total !== 1 ? 's' : ''} today`;
        } else {
            citrusCount.textContent = '';
        }
    }
}

// Initialize vitamin C toggle
function initializeToggle() {
    const toggle = document.getElementById('vitamin-c');
    toggle.addEventListener('change', (e) => {
        currentEntry.vitaminC = e.target.checked;
    });
}

// Initialize save button
function initializeSaveButton() {
    const saveBtn = document.getElementById('save-entry');

    saveBtn.addEventListener('click', () => {
        // Update remaining values from inputs
        currentEntry.sleep = parseFloat(document.getElementById('sleep').value) || null;
        currentEntry.exercise = parseInt(document.getElementById('exercise').value) || null;
        currentEntry.vodkaType = document.getElementById('vodka-type').value;
        currentEntry.notes = document.getElementById('notes').value;

        // Find existing entry for today or add new
        const existingIndex = entries.findIndex(e => e.date === currentEntry.date);

        if (existingIndex >= 0) {
            entries[existingIndex] = { ...currentEntry };
        } else {
            entries.push({ ...currentEntry });
        }

        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        saveData();
        showToast('Entry saved!');
    });
}

// Load today's entry if it exists
function loadTodayEntry() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = entries.find(e => e.date === today);

    if (todayEntry) {
        currentEntry = { ...todayEntry };
        populateForm();
    }
}

// Populate form with entry data
function populateForm() {
    // Mood
    if (currentEntry.mood) {
        const moodBtn = document.querySelector(`#mood-picker .emoji-btn[data-value="${currentEntry.mood}"]`);
        if (moodBtn) moodBtn.classList.add('selected');
    }

    // Energy
    if (currentEntry.energy) {
        const energyBtn = document.querySelector(`#energy-picker .emoji-btn[data-value="${currentEntry.energy}"]`);
        if (energyBtn) energyBtn.classList.add('selected');
    }

    // Sleep
    if (currentEntry.sleep) {
        document.getElementById('sleep').value = currentEntry.sleep;
    }

    // Water
    document.getElementById('water').value = currentEntry.water || 0;

    // Exercise
    if (currentEntry.exercise) {
        document.getElementById('exercise').value = currentEntry.exercise;
    }

    // Vodka
    document.getElementById('vodka-shots').value = currentEntry.vodkaShots || 0;
    document.getElementById('vodka-type').value = currentEntry.vodkaType || '';

    // Mixer
    if (currentEntry.mixer) {
        const mixerBtn = document.querySelector(`#mixer-picker .mixer-btn[data-value="${currentEntry.mixer}"]`);
        if (mixerBtn) mixerBtn.classList.add('selected');
    }

    // Citrus
    if (currentEntry.citrus) {
        Object.entries(currentEntry.citrus).forEach(([type, count]) => {
            const btn = document.querySelector(`#citrus-picker .citrus-btn[data-value="${type}"]`);
            if (btn && count > 0) {
                btn.classList.add('selected');
                const badge = document.createElement('span');
                badge.className = 'count';
                badge.textContent = count;
                btn.appendChild(badge);
            }
        });
        const total = Object.values(currentEntry.citrus).reduce((a, b) => a + b, 0);
        if (total > 0) {
            document.getElementById('citrus-count').textContent = `${total} citrus serving${total !== 1 ? 's' : ''} today`;
        }
    }

    // Vitamin C
    document.getElementById('vitamin-c').checked = currentEntry.vitaminC || false;

    // Notes
    document.getElementById('notes').value = currentEntry.notes || '';
}

// Initialize history tab
function initializeHistory() {
    const clearBtn = document.getElementById('clear-history');

    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all entries? This cannot be undone.')) {
            entries = [];
            saveData();
            renderHistory();
            showToast('History cleared', 'error');
        }
    });
}

// Render history list
function renderHistory() {
    const historyList = document.getElementById('history-list');

    if (entries.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No entries yet. Start tracking today!</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = entries.map((entry, index) => {
        const date = new Date(entry.date + 'T12:00:00');
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const moodEmojis = ['😫', '😔', '😐', '😊', '😄'];
        const moodEmoji = entry.mood ? moodEmojis[entry.mood - 1] : '❓';

        const citrusTotal = entry.citrus ? Object.values(entry.citrus).reduce((a, b) => a + b, 0) : 0;

        return `
            <div class="history-entry" data-index="${index}">
                <div class="history-entry-header">
                    <span class="history-entry-date">${formattedDate}</span>
                    <button class="history-entry-delete" data-index="${index}">Delete</button>
                </div>
                <div class="history-entry-summary">
                    <span>${moodEmoji} Mood</span>
                    ${entry.sleep ? `<span>💤 ${entry.sleep}h</span>` : ''}
                    ${entry.water ? `<span>💧 ${entry.water}</span>` : ''}
                    ${entry.exercise ? `<span>🏃 ${entry.exercise}m</span>` : ''}
                    ${entry.vodkaShots ? `<span>🍸 ${entry.vodkaShots}</span>` : ''}
                    ${citrusTotal ? `<span>🍋 ${citrusTotal}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add delete handlers
    historyList.querySelectorAll('.history-entry-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            if (confirm('Delete this entry?')) {
                entries.splice(index, 1);
                saveData();
                renderHistory();
                showToast('Entry deleted');
            }
        });
    });
}

// Initialize stats tab
function initializeStats() {
    const periodBtns = document.querySelectorAll('.period-btn');

    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const period = btn.dataset.period;
            updateStats(period === 'all' ? null : parseInt(period));
        });
    });
}

// Update stats display
function updateStats(days) {
    let filteredEntries = entries;

    if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredEntries = entries.filter(e => new Date(e.date) >= cutoffDate);
    }

    const count = filteredEntries.length;

    // Calculate averages
    const avgMood = count > 0
        ? (filteredEntries.reduce((sum, e) => sum + (e.mood || 0), 0) / filteredEntries.filter(e => e.mood).length || 0).toFixed(1)
        : '-';

    const avgSleep = count > 0
        ? (filteredEntries.reduce((sum, e) => sum + (e.sleep || 0), 0) / filteredEntries.filter(e => e.sleep).length || 0).toFixed(1)
        : '-';

    const avgWater = count > 0
        ? (filteredEntries.reduce((sum, e) => sum + (e.water || 0), 0) / count).toFixed(1)
        : '-';

    const totalExercise = filteredEntries.reduce((sum, e) => sum + (e.exercise || 0), 0);
    const totalVodka = filteredEntries.reduce((sum, e) => sum + (e.vodkaShots || 0), 0);
    const totalCitrus = filteredEntries.reduce((sum, e) => {
        return sum + (e.citrus ? Object.values(e.citrus).reduce((a, b) => a + b, 0) : 0);
    }, 0);

    // Update display
    document.getElementById('avg-mood').textContent = avgMood;
    document.getElementById('avg-sleep').textContent = avgSleep !== '-' ? avgSleep + 'h' : '-';
    document.getElementById('avg-water').textContent = avgWater;
    document.getElementById('total-exercise').textContent = totalExercise > 0 ? totalExercise + 'm' : '-';
    document.getElementById('total-vodka').textContent = totalVodka > 0 ? totalVodka : '-';
    document.getElementById('total-citrus').textContent = totalCitrus > 0 ? totalCitrus : '-';

    // Generate insight
    generateInsight(filteredEntries, totalVodka, avgMood, avgSleep);
}

// Generate insights based on data
function generateInsight(entries, totalVodka, avgMood, avgSleep) {
    const insightEl = document.getElementById('insight-text');

    if (entries.length < 3) {
        insightEl.textContent = 'Log more entries to see insights about your wellness patterns!';
        return;
    }

    const insights = [];

    // Vodka-mood correlation check
    const vodkaDays = entries.filter(e => e.vodkaShots > 0);
    const noVodkaDays = entries.filter(e => !e.vodkaShots || e.vodkaShots === 0);

    if (vodkaDays.length > 0 && noVodkaDays.length > 0) {
        const avgMoodVodka = vodkaDays.reduce((sum, e) => sum + (e.mood || 0), 0) / vodkaDays.filter(e => e.mood).length || 0;
        const avgMoodNoVodka = noVodkaDays.reduce((sum, e) => sum + (e.mood || 0), 0) / noVodkaDays.filter(e => e.mood).length || 0;

        if (avgMoodVodka > avgMoodNoVodka + 0.5) {
            insights.push('Your mood tends to be higher on days you enjoy vodka. Remember moderation!');
        } else if (avgMoodNoVodka > avgMoodVodka + 0.5) {
            insights.push('Your mood tends to be better on vodka-free days. Balance is key!');
        }
    }

    // Sleep insight
    if (avgSleep !== '-') {
        const sleepVal = parseFloat(avgSleep);
        if (sleepVal < 6) {
            insights.push('You\'re averaging less than 6 hours of sleep. Try to get more rest!');
        } else if (sleepVal >= 7 && sleepVal <= 9) {
            insights.push('Great job maintaining healthy sleep habits!');
        }
    }

    // Vodka consumption
    if (totalVodka > entries.length * 2) {
        insights.push('Your vodka consumption is higher than average. Consider moderating.');
    }

    // Water intake
    const avgWater = entries.reduce((sum, e) => sum + (e.water || 0), 0) / entries.length;
    if (avgWater < 4) {
        insights.push('Try to drink more water - aim for at least 8 glasses daily!');
    } else if (avgWater >= 8) {
        insights.push('Excellent hydration habits!');
    }

    // Citrus for vodka balance
    const totalCitrus = entries.reduce((sum, e) => {
        return sum + (e.citrus ? Object.values(e.citrus).reduce((a, b) => a + b, 0) : 0);
    }, 0);
    if (totalVodka > 0 && totalCitrus < totalVodka) {
        insights.push('Pro tip: Balance your vodka with some citrus for vitamin C!');
    }

    if (insights.length > 0) {
        insightEl.textContent = insights[Math.floor(Math.random() * insights.length)];
    } else {
        insightEl.textContent = 'Keep tracking! You\'re building healthy awareness of your habits.';
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (type === 'error' ? ' error' : '');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Initialize recipes tab
function initializeRecipes() {
    renderRecipes();
    renderCitrusRecipes();
    updateRecommendation();
}

// Render recipe list
function renderRecipes() {
    const recipeList = document.getElementById('recipe-list');
    recipeList.innerHTML = recipes.map((recipe, index) => createRecipeHTML(recipe, index, 'main')).join('');
    addRecipeClickHandlers(recipeList);
}

// Render citrus recipes
function renderCitrusRecipes() {
    const citrusRecipeList = document.getElementById('citrus-recipe-list');
    citrusRecipeList.innerHTML = citrusRecipes.map((recipe, index) => createRecipeHTML(recipe, index, 'citrus')).join('');
    addRecipeClickHandlers(citrusRecipeList);
}

// Create recipe HTML
function createRecipeHTML(recipe, index, type) {
    return `
        <div class="recipe-item" data-index="${index}" data-type="${type}">
            <div class="recipe-header">
                <span class="recipe-name">
                    <span class="recipe-emoji">${recipe.emoji}</span>
                    ${recipe.name}
                </span>
                <span class="recipe-badge ${recipe.badge}">${recipe.badge}</span>
            </div>
            <div class="recipe-details">
                <div class="recipe-ingredients">
                    <h4>Ingredients</h4>
                    <ul>
                        ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                <div class="recipe-instructions">
                    <h4>Instructions</h4>
                    <p>${recipe.instructions}</p>
                </div>
                <div class="recipe-wellness">
                    ${recipe.wellness.map(tag => `<span class="wellness-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// Add click handlers to recipes
function addRecipeClickHandlers(container) {
    container.querySelectorAll('.recipe-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('expanded');
        });
    });
}

// Update recommendation based on wellness data
function updateRecommendation() {
    const recAmount = document.getElementById('rec-amount');
    const recTitle = document.querySelector('.rec-title');
    const recText = document.querySelector('.rec-text');
    const recIcon = document.querySelector('.rec-icon');
    const wellnessTip = document.getElementById('wellness-tip');

    // Calculate recommendation based on recent data
    const last7Days = entries.filter(e => {
        const entryDate = new Date(e.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
    });

    let recommendedDrinks = 2; // Default moderate recommendation
    let recommendation = {
        title: 'Balanced Enjoyment',
        icon: '🎯'
    };

    if (last7Days.length >= 3) {
        // Calculate averages
        const avgSleep = last7Days.reduce((sum, e) => sum + (e.sleep || 0), 0) / last7Days.filter(e => e.sleep).length || 0;
        const avgMood = last7Days.reduce((sum, e) => sum + (e.mood || 0), 0) / last7Days.filter(e => e.mood).length || 0;
        const avgWater = last7Days.reduce((sum, e) => sum + (e.water || 0), 0) / last7Days.length;
        const totalVodka = last7Days.reduce((sum, e) => sum + (e.vodkaShots || 0), 0);
        const avgExercise = last7Days.reduce((sum, e) => sum + (e.exercise || 0), 0) / last7Days.length;

        // Adjust recommendation based on wellness factors
        if (avgSleep >= 7 && avgMood >= 4 && avgWater >= 6) {
            recommendedDrinks = 3;
            recommendation = { title: 'Feeling Great!', icon: '🌟' };
        } else if (avgSleep < 6 || avgMood < 3) {
            recommendedDrinks = 1;
            recommendation = { title: 'Take It Easy', icon: '🌙' };
        } else if (avgWater < 4) {
            recommendedDrinks = 1;
            recommendation = { title: 'Hydrate First', icon: '💧' };
        }

        // If already had a lot this week, suggest rest
        if (totalVodka > 10) {
            recommendedDrinks = 0;
            recommendation = { title: 'Rest Day Recommended', icon: '🧘' };
        } else if (totalVodka > 7) {
            recommendedDrinks = Math.min(recommendedDrinks, 1);
            recommendation = { title: 'Moderation Mode', icon: '⚖️' };
        }

        // Bonus for exercise
        if (avgExercise > 30) {
            recommendedDrinks = Math.min(recommendedDrinks + 1, 3);
        }
    }

    // Update display
    recIcon.textContent = recommendation.icon;
    recTitle.textContent = recommendation.title;

    if (recommendedDrinks === 0) {
        recAmount.textContent = 'a rest day';
        recText.innerHTML = `Based on your wellness data, we recommend <strong>${recAmount.textContent}</strong> today.`;
    } else {
        recAmount.textContent = `${recommendedDrinks} drink${recommendedDrinks !== 1 ? 's' : ''}`;
        recText.innerHTML = `Based on your wellness data, we recommend up to <strong>${recAmount.textContent}</strong> today.`;
    }

    // Random wellness tip
    wellnessTip.textContent = wellnessTips[Math.floor(Math.random() * wellnessTips.length)];
}
