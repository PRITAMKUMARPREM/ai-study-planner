// Load subjects from localStorage, defaulting to empty array if none exist
let subjects = JSON.parse(localStorage.getItem('study_subjects')) || [];

function saveSubjects() {
    localStorage.setItem('study_subjects', JSON.stringify(subjects));
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sleek Curve Chart
    const ctx = document.getElementById('performanceChart').getContext('2d');

    // Smooth gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    // Dark violet gradient
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.4)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0.0)');

    window.performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            datasets: [{
                label: 'Quiz Score %',
                data: getWeeklyQuizData(),
                borderColor: '#8A2BE2', // brandViolet
                backgroundColor: gradient,
                borderWidth: 4,
                pointBackgroundColor: '#1A1A24', // cardBg
                pointBorderColor: '#8A2BE2',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.4 // Extra smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Outfit', sans-serif", weight: 'bold' }, color: '#A0A0B0' }
                },
                y: {
                    min: 0,
                    max: 100,
                    border: { display: false },
                    grid: { color: '#2A2A35', strokeDash: [5, 5] },
                    ticks: {
                        font: { family: "'Outfit', sans-serif", weight: 'bold' },
                        color: '#A0A0B0',
                        stepSize: 20,
                        callback: function (value) { return value + '%'; }
                    }
                }
            }
        }
    });

    renderSubjectsList();
    updateDashboardStats();
});

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Render dynamic, bubbly subject cards
function renderSubjectsList() {
    const container = document.getElementById('subjectListContainer');
    container.innerHTML = '';

    subjects.forEach((sub, index) => {
        // Dark Theme overrides based on status
        let bgHex, textHex, borderHex, labelBg, iconColor;

        if (sub.status === 'weak') {
            bgHex = '#21182B'; // Very dark pink tint
            textHex = '#B084FF'; // brandVioletLight
            borderHex = '#3A2045';
            labelBg = '#8A2BE2'; // brandViolet
            iconColor = 'text-brandVioletLight';
        } else if (sub.status === 'strong') {
            bgHex = '#182B24'; // Very dark green tint
            textHex = '#00E5FF'; // accentTeal
            borderHex = '#204538';
            labelBg = '#00B57E';
            iconColor = 'text-emerald-500';
        } else {
            bgHex = '#2B2418'; // Very dark orange tint
            textHex = '#FF9900';
            borderHex = '#453520';
            labelBg = '#FF9900';
            iconColor = 'text-brandOrange';
        }

        container.innerHTML += `
            <div class="group flex items-center justify-between p-4 rounded-3xl border hover:shadow-md transition-all duration-300" style="background-color: ${bgHex}; border-color: ${borderHex};">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-cardBg border border-brandGray flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${iconColor} text-xl">
                        <i class="fa-solid ${sub.icon || 'fa-book'}"></i>
                    </div>
                    <div>
                        <h4 class="font-display font-bold text-textMain text-lg leading-none mb-1">${sub.name}</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] uppercase font-black tracking-wider text-white px-2 py-0.5 rounded-md" style="background-color: ${labelBg};">${sub.status}</span>
                            <span class="text-xs font-bold text-textMuted whitespace-nowrap"><i class="fa-solid fa-arrow-trend-up"></i>  ${sub.mastery}% mastery</span>
                        </div>
                    </div>
                </div>
                <div class="hidden sm:flex text-right flex-col items-end mr-4">
                    <div class="flex gap-1">
                        ${[...Array(5)].map((_, i) => `<div class="w-2 h-6 rounded-full ${i < sub.difficulty ? 'bg-brandViolet' : 'bg-[#2A2A35]'}"></div>`).join('')}
                    </div>
                    <span class="text-[10px] font-bold text-textMuted uppercase mt-1">Level ${sub.difficulty}</span>
                </div>
                
                <button onclick="removeSubject(${index})" class="ml-auto flex items-center justify-center w-10 h-10 rounded-xl bg-bgMain hover:bg-[#FF4D4D]/20 border border-brandGray hover:border-[#FF4D4D] text-textMuted hover:text-[#FF4D4D] transition-all" title="Remove Subject">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });
}

// Function to retrieve weekly quiz performance data (scores as percentages)
function getWeeklyQuizData() {
    // study_quizWeekly stores: { dayIndex: { totalCorrect, totalQuestions } }
    let quizWeekly = JSON.parse(localStorage.getItem('study_quizWeekly')) || {};
    const weeklyScores = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 to Sun=6

    for (let i = 0; i < 7; i++) {
        if (quizWeekly[i] && quizWeekly[i].totalQuestions > 0) {
            weeklyScores[i] = Math.round((quizWeekly[i].totalCorrect / quizWeekly[i].totalQuestions) * 100);
        }
    }
    return weeklyScores;
}

// Record a quiz score for today
function recordQuizScore(correct, total) {
    const dayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun
    let quizWeekly = JSON.parse(localStorage.getItem('study_quizWeekly')) || {};

    // Check if we need to reset the week
    const lastQuizDate = localStorage.getItem('study_lastQuizDate');
    const todayStr = new Date().toDateString();
    if (lastQuizDate) {
        const lastDate = new Date(lastQuizDate);
        const lastDayIndex = (lastDate.getDay() + 6) % 7;
        // If new week started (today is Mon and last quiz was on a different week)
        if (dayIndex < lastDayIndex || (new Date() - lastDate) > 7 * 24 * 60 * 60 * 1000) {
            quizWeekly = {};
        }
    }

    if (!quizWeekly[dayIndex]) {
        quizWeekly[dayIndex] = { totalCorrect: 0, totalQuestions: 0 };
    }
    quizWeekly[dayIndex].totalCorrect += correct;
    quizWeekly[dayIndex].totalQuestions += total;

    localStorage.setItem('study_quizWeekly', JSON.stringify(quizWeekly));
    localStorage.setItem('study_lastQuizDate', todayStr);

    updatePerformanceChart();
}

// Function to update the performance chart with new data
function updatePerformanceChart() {
    if (window.performanceChart) {
        window.performanceChart.data.datasets[0].data = getWeeklyQuizData();
        window.performanceChart.update();
    }
}

function updateDashboardStats() {
    // Initialize or load LocalStorage data
    if (!localStorage.getItem('study_focusTotalMins')) {
        localStorage.setItem('study_focusTotalMins', 0); // Start at 0
    }
    if (!localStorage.getItem('study_focusTodayMins')) {
        localStorage.setItem('study_focusTodayMins', 0); // Start at 0
    }
    if (!localStorage.getItem('study_dailyStreak')) {
        localStorage.setItem('study_dailyStreak', 0); // Start at 0
    }

    // Check Daily Streak
    const todayStr = new Date().toDateString();
    const lastLogin = localStorage.getItem('study_lastLoginDate');
    let dailyStreak = parseInt(localStorage.getItem('study_dailyStreak'));

    const dayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun
    let weeklyData = JSON.parse(localStorage.getItem('study_focusWeekly')) || [0, 0, 0, 0, 0, 0, 0];

    if (lastLogin) {
        if (lastLogin !== todayStr) {
            dailyStreak++;
            localStorage.setItem('study_dailyStreak', dailyStreak);

            // Before resetting today's mins, save them to the weekly history
            const lastTodayMins = parseInt(localStorage.getItem('study_focusTodayMins') || '0');
            const lastDayDate = new Date(lastLogin);
            const lastDayIndex = (lastDayDate.getDay() + 6) % 7;

            // If it's a new week (e.g. today is Mon and last login was earlier, or diff > 6 days), reset weekly array
            // A simple check: if current dayIndex is smaller than lastDayIndex AND they aren't the same day
            if (dayIndex < lastDayIndex || (new Date() - lastDayDate) > 7 * 24 * 60 * 60 * 1000) {
                weeklyData = [0, 0, 0, 0, 0, 0, 0];
            } else {
                weeklyData[lastDayIndex] = lastTodayMins / 60;
            }

            localStorage.setItem('study_focusWeekly', JSON.stringify(weeklyData));
            localStorage.setItem('study_lastLoginDate', todayStr);
            localStorage.setItem('study_focusTodayMins', 0); // Reset today's stats
        }
    } else {
        localStorage.setItem('study_lastLoginDate', todayStr);
        localStorage.setItem('study_focusWeekly', JSON.stringify(weeklyData));
    }

    // Always persist the current day's focus data to weekly array
    const currentTodayMins = parseInt(localStorage.getItem('study_focusTodayMins') || '0');
    weeklyData[dayIndex] = currentTodayMins / 60;
    localStorage.setItem('study_focusWeekly', JSON.stringify(weeklyData));

    // Calculate Focus Hours
    const totalMinutes = parseInt(localStorage.getItem('study_focusTotalMins'));
    const todayMinutes = parseInt(localStorage.getItem('study_focusTodayMins'));

    const baseFocusHours = Math.floor(totalMinutes / 60);

    // Calculate Rank
    let productivityRank = "Bronze";
    let productivityRankTop = "Top 50%";
    if (baseFocusHours >= 10) { productivityRank = "Silver"; productivityRankTop = "Top 30%"; }
    if (baseFocusHours >= 14) { productivityRank = "Gold"; productivityRankTop = "Top 15%"; }
    if (baseFocusHours >= 20) { productivityRank = "Diamond"; productivityRankTop = "Top 5%"; }

    // Update static DOM elements
    const statFocusHours = document.getElementById('statFocusHours');
    const statFocusHoursPlus = document.getElementById('statFocusHoursPlus');
    const statDailyStreak = document.getElementById('statDailyStreak');
    const statProductivityRank = document.getElementById('statProductivityRank');
    const statProductivityRankTop = document.getElementById('statProductivityRankTop');

    if (statFocusHours) statFocusHours.innerText = baseFocusHours;
    if (statFocusHoursPlus) {
        if (todayMinutes > 0) {
            const todayHr = Math.floor(todayMinutes / 60);
            const todayMin = todayMinutes % 60;
            let displayStr = "+";
            if (todayHr > 0) displayStr += `${todayHr}h `;
            if (todayMin > 0 || todayHr === 0) displayStr += `${todayMin}m`; // if only minutes, don't show 0h

            // Replicate the previous design UI (e.g. "+2h") perfectly if it's entirely rounded hours
            if (todayMin === 0 && todayHr > 0) displayStr = `+${todayHr}h`;

            statFocusHoursPlus.innerText = displayStr.trim();
            statFocusHoursPlus.classList.remove('hidden');
        } else {
            statFocusHoursPlus.classList.add('hidden');
        }
    }
    if (statDailyStreak) statDailyStreak.innerText = dailyStreak;
    if (statProductivityRank) statProductivityRank.innerText = productivityRank;
    if (statProductivityRankTop) statProductivityRankTop.innerText = productivityRankTop;

    // Update performance chart after stats change
    updatePerformanceChart();
    // Dynamic AI Alert calculation based on the subjects array
    const weakSubjects = subjects.filter(sub => sub.status === 'weak');
    const weakCount = weakSubjects.length;
    const alertTitleEl = document.getElementById('statAIAlertTitle');
    const alertDescEl = document.getElementById('statAIAlertDesc');

    if (alertTitleEl && alertDescEl) {
        if (weakCount > 0) {
            alertTitleEl.innerText = `${weakCount} Weak Topic${weakCount > 1 ? 's' : ''}`;

            // Format the list of names
            const names = weakSubjects.map(sub => sub.name);
            let descText = "";
            if (names.length === 1) {
                descText = `${names[0]} needs immediate review.`;
            } else if (names.length === 2) {
                descText = `${names.join(' & ')} need immediate review.`;
            } else {
                descText = `${names[0]}, ${names[1]} and ${names.length - 2} more need review.`;
            }
            alertDescEl.innerText = descText;
        } else {
            alertTitleEl.innerText = "0 Weak Topics!";
            alertDescEl.innerText = "You're all caught up. Keep crushing it!";
            alertTitleEl.parentElement.parentElement.classList.remove('border-[#FFD1D1]');
            alertTitleEl.parentElement.parentElement.classList.add('border-emerald-500/50');
            // Change the little pink dot to green
            const dots = alertTitleEl.parentElement.parentElement.querySelectorAll('.bg-brandVioletLight');
            dots.forEach(dot => {
                dot.classList.remove('bg-brandVioletLight');
                dot.classList.add('bg-emerald-500');
            });
            const textAlert = alertTitleEl.parentElement.parentElement.querySelector('.text-brandPink');
            if (textAlert) {
                textAlert.classList.remove('text-brandPink');
                textAlert.classList.add('text-emerald-500');
                textAlert.innerText = "AI Praise";
            }
        }
    }
}

function addSubject() {
    const input = document.getElementById('subjectName');
    const diff = document.getElementById('difficultyLevel');
    const name = input.value.trim();
    const difficulty = parseInt(diff.value);

    if (!name) {
        showToast("Oops! Subject name cannot be empty.");
        return;
    }
    subjects.push({
        name: name,
        difficulty: difficulty,
        status: difficulty > 3 ? "weak" : "strong", // Automatically flag difficulty > 3 as "weak"
        mastery: 0,
        icon: "fa-star", // default icon
        color: "brandOrange"
    });

    saveSubjects();
    renderSubjectsList();
    updateDashboardStats();
    input.value = '';
    showToast(`Added ${name}! Let's crush it.`);
}

function removeSubject(index) {
    if (index >= 0 && index < subjects.length) {
        const removedName = subjects[index].name;
        subjects.splice(index, 1);
        saveSubjects();
        renderSubjectsList();
        updateDashboardStats();
        showToast(`${removedName} removed.`);
    }
}

function generateAIPlan() {
    const loader = document.getElementById('aiLoader');
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');

    setTimeout(() => {
        loader.classList.remove('opacity-100');
        loader.classList.add('opacity-0', 'pointer-events-none');
        buildTimelineUI();
    }, 2000); // 2 second mock load
}

function buildTimelineUI() {
    const modal = document.getElementById('scheduleModal');
    const inner = document.getElementById('scheduleModalInner');
    const container = document.getElementById('modalScheduleContent');
    const hours = document.getElementById("studyHours").value;

    container.innerHTML = '';

    let timeTracking = 0;

    let totalWeight = subjects.reduce((sum, sub) => sum + (sub.status === 'weak' ? 0.8 : 0.2), 0);
    // Handle edge case where no subjects exist
    if (totalWeight === 0) totalWeight = 1;

    subjects.forEach((sub, idx) => {
        let weight = (sub.status === 'weak' ? 0.8 : 0.2) / totalWeight; // Normalize distribution
        let durationInHours = weight * hours;
        let durationStr = convertToTime(durationInHours);

        let startTime = new Date();
        startTime.setHours(14, 0, 0); // Start at 2pm
        startTime.setMinutes(startTime.getMinutes() + (timeTracking * 60));
        let formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let iconBgColor = sub.status === 'weak' ? 'bg-brandVioletLight' : 'bg-brandBlue';

        // Timeline Block
        container.innerHTML += `
            <div class="flex gap-6 relative group">
                <!-- Timestamp -->
                <div class="w-16 pt-3 text-right">
                    <span class="font-display font-bold text-textMain text-lg">${formattedTime}</span>
                </div>
                
                <!-- Timeline Dot -->
                <div class="relative z-10 w-12 flex justify-center pt-4">
                    <div class="w-6 h-6 rounded-full border-4 border-bgMain ${iconBgColor} shadow-md group-hover:scale-125 transition-transform z-10"></div>
                </div>
                
                <!-- Content Card -->
                <div class="flex-1 bg-cardBg rounded-3xl p-5 shadow-sm border border-brandGray group-hover:shadow-glow-subtle transition-shadow group-hover:border-brandViolet/50">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-display font-bold text-xl text-textMain">${sub.name}</h4>
                        <div class="bg-bgMain text-textMain font-bold px-3 py-1 rounded-lg text-sm flex items-center gap-2 border border-brandGray">
                            <i class="fa-regular fa-hourglass-half"></i> ${durationStr}
                        </div>
                    </div>
                    <p class="text-textMuted font-medium text-sm">
                        ${sub.status === 'weak' ? 'AI focus session targeting low retention areas.' : 'Standard spaced repetition block.'}
                    </p>
                </div>
            </div>
        `;
        timeTracking += durationInHours;
    });

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => inner.classList.remove('scale-95'), 50);
}

function convertToTime(decimalHours) {
    let totalMins = Math.round(decimalHours * 60);
    let h = Math.floor(totalMins / 60);
    let m = totalMins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function closeModal() {
    const modal = document.getElementById('scheduleModal');
    const inner = document.getElementById('scheduleModalInner');
    inner.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    }, 200);
}

function openPremiumModal() {
    const modal = document.getElementById('premiumModal');
    const inner = document.getElementById('premiumModalInner');
    if (modal && inner) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        setTimeout(() => inner.classList.remove('scale-95'), 50);
    }
}

function closePremiumModal() {
    const modal = document.getElementById('premiumModal');
    const inner = document.getElementById('premiumModalInner');
    if (modal && inner) {
        inner.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('opacity-0', 'pointer-events-none');
        }, 300);
    }
}

function acceptPlan() {
    closeModal();
    // Switch to focus view and pass a time based on the plan 
    // For simplicity, we'll set it to a 60 min focus block
    switchTab('focus');
    setFocusTime(60);
    showToast("Session triggered! Head to Focus Timer.");
}

// Hover/Click logic for AI Chatbot Widget
function toggleChatbot() {
    const window = document.getElementById('chatbotWindow');
    const trigger = document.getElementById('chatbotTriggerBtn');

    if (window.classList.contains('scale-0')) {
        // Open
        window.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
        window.classList.add('scale-100', 'opacity-100');
        trigger.classList.add('rotate-12', 'scale-95'); // feedback on button
    } else {
        // Close
        window.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
        window.classList.remove('scale-100', 'opacity-100');
        trigger.classList.remove('rotate-12', 'scale-95');
    }
}

// Send a message from the Floating Chatbot
async function sendChatbotMessage() {
    const input = document.getElementById('chatbotInput');
    const text = input.value.trim();
    if (!text) return;

    // The chat area is the container just before the input area
    const chatArea = document.querySelector('#chatbotWindow .overflow-y-auto');

    // Remove the typing indicator if it was there (hardcoded in HTML currently)
    const indicators = chatArea.querySelectorAll('.animate-bounce');
    if (indicators.length > 0) {
        indicators[0].closest('.flex.gap-3').remove();
    }

    // Add User Message
    chatArea.innerHTML += `
        <div class="flex gap-3 max-w-[85%] self-end">
            <div class="bg-brandVioletLight p-4 rounded-[20px] rounded-tr-sm shadow-glow-pink text-white text-sm font-medium">
                ${text}
            </div>
        </div>
    `;

    input.value = '';
    chatArea.scrollTop = chatArea.scrollHeight;

    // Add Thinking Indicator
    const thinkingId = 'bot-think-' + Date.now();
    chatArea.innerHTML += `
        <div id="${thinkingId}" class="flex gap-3 max-w-[85%]">
            <div class="bg-cardBg px-4 py-3 rounded-[20px] rounded-tl-sm shadow-sm flex gap-2 items-center">
                <div class="w-2 h-2 bg-brandPink rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-brandPink rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-brandPink rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
        </div>
    `;
    chatArea.scrollTop = chatArea.scrollHeight;

    // Call Real AI Backend Directly (Client-side)
    try {
        const GEMINI_API_KEY = "AIzaSyAI9cNIriN1ce3oi3UATCv130zxFi4xhRo";
        const systemInstruction = "You are Study Buddy AI, a helpful, encouraging, and highly intelligent AI Tutor. Always explain academic concepts clearly, like you are teaching a bright student. Use formatting (bullet points, bold text) to make your answers easy to read. Be concise but thorough.";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) thinkingEl.remove();

        if (!response.ok) {
            throw new Error(data.error?.message || "Failed to get AI response");
        }

        let aiText = "Sorry, I couldn't generate a response.";
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            aiText = data.candidates[0].content.parts[0].text;
        }

        let formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br/>');

        chatArea.innerHTML += `
            <div class="flex gap-3 max-w-[85%]">
                <div class="bg-brandViolet/10 p-4 rounded-[20px] rounded-tl-sm shadow-sm text-textMain text-sm font-medium">
                    ${formattedText}
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById(thinkingId)?.remove();
        chatArea.innerHTML += `
            <div class="flex gap-3 max-w-[85%]">
                <div class="bg-red-50 p-4 rounded-[20px] rounded-tl-sm shadow-sm text-red-600 text-sm font-medium border border-red-200">
                    Oops! Error: ${error.message}
                </div>
            </div>
        `;
    }

    chatArea.scrollTop = chatArea.scrollHeight;
}

// Tab Switching Logic
function switchTab(tabId) {
    // 1. Hide all views
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => {
        view.classList.add('hidden');
    });

    // 2. Show selected view
    const selectedView = document.getElementById('view-' + tabId);
    if (selectedView) {
        selectedView.classList.remove('hidden');
    }

    // 3. Update nav items styling
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        // Reset to inactive state
        item.classList.remove('bg-brandViolet', 'text-white', 'shadow-glow-violet');
        item.classList.add('text-textMuted', 'hover:bg-bgMain', 'hover:text-brandViolet');

        // Hide the animated hover effect div if it exists
        const hoverDiv = item.querySelector('.absolute.inset-0');
        if (hoverDiv) {
            hoverDiv.style.display = 'none';
        }
    });

    // 4. Set active styling on clicked nav item
    const activeNav = document.getElementById('nav-' + tabId);
    if (activeNav) {
        activeNav.classList.remove('text-textMuted', 'hover:bg-bgMain', 'hover:text-brandViolet');
        activeNav.classList.add('bg-brandViolet', 'text-white', 'shadow-glow-violet');

        // Show the animated hover effect div if it exists
        const activeHoverDiv = activeNav.querySelector('.absolute.inset-0');
        if (activeHoverDiv) {
            activeHoverDiv.style.display = 'block';
        } else {
            // Re-create the background effect for dynamically activated tabs if missing
            const bgEffect = document.createElement('div');
            bgEffect.className = 'absolute inset-0 bg-cardBg/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300';
            activeNav.insertBefore(bgEffect, activeNav.firstChild);
        }
    }

    // 5. If switching to leaderboard, re-render with latest data
    if (tabId === 'leaderboard') {
        renderLeaderboard();
    }
}

// Deadline form logic
function toggleDeadlineForm() {
    const form = document.getElementById('deadlineForm');
    const btn = document.getElementById('addDeadlineBtn');
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        btn.classList.add('hidden');
    } else {
        form.classList.add('hidden');
        btn.classList.remove('hidden');
        // Clear inputs
        document.getElementById('deadlineTitle').value = '';
        document.getElementById('deadlineDate').value = '';
    }
}

function addDeadline() {
    const title = document.getElementById('deadlineTitle').value.trim();
    const dateStr = document.getElementById('deadlineDate').value;
    const colorClass = document.getElementById('deadlineColor').value;

    if (!title || !dateStr) {
        showToast("Please enter both a title and a date.");
        return;
    }

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let daysText = "";
    if (diffDays === 0) daysText = "Today";
    else if (diffDays === 1) daysText = "Tomorrow";
    else if (diffDays > 1) daysText = `In ${diffDays} days`;
    else if (diffDays < 0) daysText = `${Math.abs(diffDays)} days ago`;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();

    const container = document.getElementById('deadlineListContainer');

    const newDoc = document.createElement('div');
    newDoc.className = `bg-bgMain p-4 rounded-2xl flex gap-4 items-center border border-brandGray/50 border-l-4 border-l-${colorClass}`;
    newDoc.innerHTML = `
        <div class="bg-cardBg w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-brandGray shrink-0">
            <span class="text-xs font-bold text-${colorClass} uppercase">${month}</span>
            <span class="text-lg font-black text-textMain leading-none">${day}</span>
        </div>
        <div>
            <h4 class="font-bold text-textMain text-sm">${title}</h4>
            <p class="text-xs font-semibold text-textMuted">${daysText}</p>
        </div>
    `;

    container.appendChild(newDoc);

    showToast(`Added deadline: ${title}`);
    toggleDeadlineForm();
}

// ==========================================
// Focus Mode Logic
// ==========================================
let focusSeconds = 45 * 60;
let initialFocusSeconds = 45 * 60;
let focusInterval = null;

function setFocusTime(minutes) {
    if (focusInterval) {
        showToast("Can't change time while focusing!");
        return;
    }

    // Update active button styling
    document.querySelectorAll('.focus-time-btn').forEach(btn => {
        btn.classList.remove('bg-brandViolet', 'shadow-glow-violet');
        btn.classList.add('bg-bgMain', 'border', 'border-brandGray', 'hover:bg-brandViolet/20', 'hover:border-brandViolet');

        if (parseInt(btn.dataset.time) === minutes) {
            btn.classList.add('bg-brandViolet', 'shadow-glow-violet');
            btn.classList.remove('bg-bgMain', 'border', 'border-brandGray', 'hover:bg-brandViolet/20', 'hover:border-brandViolet');
        }
    });

    focusSeconds = minutes * 60;
    initialFocusSeconds = focusSeconds;
    updateFocusDisplay();
}

function updateFocusDisplay() {
    const mins = Math.floor(focusSeconds / 60);
    const secs = focusSeconds % 60;
    document.getElementById('focusTimeDisplay').innerText =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function startFocusMode() {
    if (focusInterval) return;

    try {
        const response = await fetch('http://localhost:5001/api/focus/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationMinutes: Math.ceil(initialFocusSeconds / 60) })
        });

        if (!response.ok) {
            const data = await response.json();
            console.warn(`Distraction blocker unavailable: ${data.error || "Unknown error"}`);
        }
    } catch (error) {
        console.warn("Backend not available — timer will run without distraction blocking.");
    }

    // Track when session started for elapsed time calculation
    window._focusStartTimestamp = Date.now();

    // UI Changes
    document.getElementById('startFocusBtn').classList.add('hidden');
    document.getElementById('stopFocusBtn').classList.remove('hidden');
    document.getElementById('focusTimeOptions').classList.add('opacity-50', 'pointer-events-none');

    showToast("Focus Mode Active!");

    // Timer countdown
    focusInterval = setInterval(() => {
        if (focusSeconds <= 0) {
            stopFocusMode(true); // completed automatically
            return;
        }
        focusSeconds--;
        updateFocusDisplay();
    }, 1000);
}

async function stopFocusMode(autoCompleted = false) {
    if (!focusInterval && !autoCompleted) return;

    try {
        const response = await fetch('http://localhost:5001/api/focus/stop', { method: 'POST' });
        if (!response.ok) {
            console.warn("Backend failed to stop focus mode correctly.");
        }
    } catch (e) {
        console.warn("Backend not accessible during stop.");
    }

    clearInterval(focusInterval);
    focusInterval = null;

    // Calculate actual elapsed minutes
    let sessionMins;
    if (autoCompleted) {
        sessionMins = Math.round(initialFocusSeconds / 60);
    } else {
        // Calculate elapsed time from when the session started
        const elapsedMs = Date.now() - (window._focusStartTimestamp || Date.now());
        sessionMins = Math.max(1, Math.round(elapsedMs / 60000)); // At least 1 minute
    }

    // Reset timer to original selection
    focusSeconds = initialFocusSeconds;
    updateFocusDisplay();

    // UI Changes
    document.getElementById('startFocusBtn').classList.remove('hidden');
    document.getElementById('stopFocusBtn').classList.add('hidden');
    document.getElementById('focusTimeOptions').classList.remove('opacity-50', 'pointer-events-none');

    // Always save session data (both completed and early-stopped)
    let totalMins = parseInt(localStorage.getItem('study_focusTotalMins') || '0');
    let todayMins = parseInt(localStorage.getItem('study_focusTodayMins') || '0');

    localStorage.setItem('study_focusTotalMins', totalMins + sessionMins);
    localStorage.setItem('study_focusTodayMins', todayMins + sessionMins);

    // Save to focus history for the heatmap
    const todayStr = toDateStr(new Date());
    let focusHistory = JSON.parse(localStorage.getItem('study_focusHistory')) || {};
    focusHistory[todayStr] = (focusHistory[todayStr] || 0) + 1;
    localStorage.setItem('study_focusHistory', JSON.stringify(focusHistory));

    updateDashboardStats(); // Refresh the UI including the chart

    // Award focus XP: 1 XP per minute, max 30 XP per session
    const focusXP = Math.min(sessionMins, 30);
    awardQuizXP(focusXP);

    if (autoCompleted) {
        showToast(`Focus Session Complete! +${focusXP} XP earned! 🔥`);
    } else {
        showToast(`Session ended. ${sessionMins} min recorded — +${focusXP} XP! 💪`);
    }
}

// ==========================================
// AI Tutor Logic
// ==========================================
function openAITutorModal(promptType = '') {
    const modal = document.getElementById('aiTutorModal');
    const inner = document.getElementById('aiTutorModalInner');
    const input = document.getElementById('aiTutorInput');
    const chatHistory = document.getElementById('aiTutorChatHistory');

    // Pre-fill input based on prompt type
    let initialText = '';
    if (promptType === 'explain') initialText = "Explain Linked Lists like I'm five.";
    if (promptType === 'quiz') initialText = "Test me on Calculus III derivatives.";
    if (promptType === 'summarize') initialText = "Can you summarize these notes for me? \n\n";
    if (promptType === 'code') initialText = "Help me find the bug in this function:\n\n";

    input.value = initialText;

    // Clear previous chat
    chatHistory.innerHTML = `
        <div class="flex gap-3 mb-6">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF00A6] to-brandViolet flex items-center justify-center shrink-0 mt-1">
                <i class="fa-solid fa-brain text-white text-xs"></i>
            </div>
            <div class="bg-bgMain p-4 rounded-2xl rounded-tl-sm border border-brandGray max-w-[85%] text-textMain text-sm">
                <p>Hi Pritam! I'm your StudyAI Tutor. How can I help you accelerate your learning today?</p>
            </div>
        </div>
    `;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        inner.classList.remove('scale-95');
        if (initialText) {
            input.focus();
            // adjust height
            input.style.height = '';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        }
    }, 50);
}

function closeAITutorModal() {
    const modal = document.getElementById('aiTutorModal');
    const inner = document.getElementById('aiTutorModalInner');

    inner.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    }, 200);
}

async function sendAITutorMessage() {
    const input = document.getElementById('aiTutorInput');
    const text = input.value.trim();
    if (!text) return;

    const chatHistory = document.getElementById('aiTutorChatHistory');

    // Add User Message
    chatHistory.innerHTML += `
        <div class="flex gap-3 mb-6 flex-row-reverse">
            <img src="https://ui-avatars.com/api/?name=Pritam+Kumar&background=4318FF&color=fff&rounded=true" alt="Profile" class="w-8 h-8 rounded-full shrink-0 mt-1">
            <div class="bg-brandViolet p-4 rounded-2xl rounded-tr-sm text-white text-sm max-w-[85%]">
                <p class="whitespace-pre-wrap">${text}</p>
            </div>
        </div>
    `;

    input.value = '';
    input.style.height = 'auto'; // reset height

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Show typing status
    const status = document.getElementById('aiTutorStatus');
    status.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...';

    // Add hidden AI thinking bubble
    const thinkingId = 'think-' + Date.now();
    chatHistory.innerHTML += `
        <div id="${thinkingId}" class="flex gap-3 mb-6">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF00A6] to-brandViolet flex items-center justify-center shrink-0 mt-1">
                <i class="fa-solid fa-brain text-white text-xs"></i>
            </div>
            <div class="bg-bgMain p-4 rounded-2xl rounded-tl-sm border border-brandGray max-w-[85%] text-textMuted text-sm flex items-center gap-2">
                <div class="w-1.5 h-1.5 bg-brandViolet rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-brandViolet rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-1.5 h-1.5 bg-brandViolet rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    `;
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Detect if this is a quiz request
    const lowerText = text.toLowerCase();
    const isQuizRequest = lowerText.includes('quiz') || lowerText.includes('test me') || lowerText.includes('mcq') ||
        lowerText.includes('test my') || lowerText.includes('question');

    // Call Real AI Backend Directly (Client-side)
    try {
        const GEMINI_API_KEY = "AIzaSyAI9cNIriN1ce3oi3UATCv130zxFi4xhRo";

        let systemInstruction;
        if (isQuizRequest) {
            systemInstruction = `You are a quiz generator. Generate exactly 5 multiple-choice questions based on the user's request. Return ONLY a valid JSON array, no markdown, no code fences, no extra text. Each object must have: "question" (string), "options" (array of 4 strings), "correct" (0-based index of correct option). Example: [{"question":"What is 2+2?","options":["3","4","5","6"],"correct":1}]`;
        } else {
            systemInstruction = "You are Study Buddy AI, a helpful, encouraging, and highly intelligent AI Tutor. Always explain academic concepts clearly, like you are teaching a bright student. Use formatting (bullet points, bold text) to make your answers easy to read. Be concise but thorough.";
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) thinkingEl.remove();

        if (!response.ok) {
            throw new Error(data.error?.message || "Failed to get AI response");
        }

        let aiText = "Sorry, I couldn't generate a response.";
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            aiText = data.candidates[0].content.parts[0].text;
        }

        if (isQuizRequest) {
            // Parse JSON quiz from AI response
            let questions;
            try {
                // Clean the response: remove code fences if present
                let cleaned = aiText.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
                }
                questions = JSON.parse(cleaned);
            } catch (parseErr) {
                throw new Error("AI didn't return a valid quiz format. Try again!");
            }

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error("No questions generated. Try rephrasing your request.");
            }

            // Render interactive quiz
            const quizId = 'quiz-' + Date.now();
            let quizHTML = `<div id="${quizId}" class="space-y-4">
                <p class="text-brandVioletLight font-bold text-xs uppercase tracking-widest mb-2">📝 Quiz — ${questions.length} Questions</p>`;

            questions.forEach((q, idx) => {
                quizHTML += `<div class="quiz-question bg-cardBg rounded-xl p-3 border border-brandGray" data-correct="${q.correct}" data-answered="false">
                    <p class="text-white text-sm font-bold mb-2">${idx + 1}. ${q.question}</p>
                    <div class="space-y-1.5">`;
                q.options.forEach((opt, optIdx) => {
                    quizHTML += `<button onclick="handleQuizAnswer(this, ${optIdx}, ${q.correct}, '${quizId}')"
                        class="quiz-option w-full text-left px-3 py-2 rounded-lg text-sm font-medium border border-brandGray/50 text-textMuted hover:border-brandViolet hover:text-white hover:bg-brandViolet/10 transition-all"
                        data-optidx="${optIdx}">
                        <span class="font-bold text-brandVioletLight mr-2">${String.fromCharCode(65 + optIdx)}.</span> ${opt}
                    </button>`;
                });
                quizHTML += `</div></div>`;
            });

            quizHTML += `<div id="${quizId}-result" class="hidden mt-3 p-3 rounded-xl text-center font-bold text-sm"></div></div>`;

            chatHistory.innerHTML += `
                <div class="flex gap-3 mb-6">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF00A6] to-brandViolet flex items-center justify-center shrink-0 mt-1">
                        <i class="fa-solid fa-brain text-white text-xs"></i>
                    </div>
                    <div class="bg-bgMain p-4 rounded-2xl rounded-tl-sm border border-brandGray max-w-[90%] text-textMain text-sm">
                        ${quizHTML}
                    </div>
                </div>
            `;
        } else {
            // Normal AI response
            let formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br/>');

            chatHistory.innerHTML += `
                <div class="flex gap-3 mb-6">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF00A6] to-brandViolet flex items-center justify-center shrink-0 mt-1">
                        <i class="fa-solid fa-brain text-white text-xs"></i>
                    </div>
                    <div class="bg-bgMain p-4 rounded-2xl rounded-tl-sm border border-brandGray max-w-[85%] text-textMain text-sm">
                        <p>${formattedText}</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById(thinkingId)?.remove();
        chatHistory.innerHTML += `
                < div class="flex gap-3 mb-6" >
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-red-600 flex items-center justify-center shrink-0 mt-1">
                    <i class="fa-solid fa-triangle-exclamation text-white text-xs"></i>
                </div>
                <div class="bg-red-50 p-4 rounded-2xl rounded-tl-sm border border-red-200 text-red-600 text-sm">
                    <p>Sorry, I encountered an error: ${error.message}</p>
                    <p class="text-xs mt-2 text-red-400">(Hint: Is your GEMINI_API_KEY set in .env?)</p>
                </div>
            </div >
                `;
    }

    status.innerText = 'Online and ready';
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Handle quiz answer selection
function handleQuizAnswer(btnEl, selectedIdx, correctIdx, quizId) {
    const questionDiv = btnEl.closest('.quiz-question');
    if (questionDiv.dataset.answered === 'true') return; // Already answered
    questionDiv.dataset.answered = 'true';

    // Disable all buttons in this question
    const allButtons = questionDiv.querySelectorAll('.quiz-option');
    allButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.remove('hover:border-brandViolet', 'hover:text-white', 'hover:bg-brandViolet/10');
        btn.style.cursor = 'default';

        const optIdx = parseInt(btn.dataset.optidx);
        if (optIdx === correctIdx) {
            // Correct answer — always highlight green
            btn.classList.add('border-emerald-500', 'bg-emerald-500/20', 'text-emerald-400');
            btn.classList.remove('border-brandGray/50', 'text-textMuted');
        } else if (optIdx === selectedIdx && selectedIdx !== correctIdx) {
            // Wrong selected answer — highlight red
            btn.classList.add('border-red-500', 'bg-red-500/20', 'text-red-400');
            btn.classList.remove('border-brandGray/50', 'text-textMuted');
        }
    });

    // Check if all questions in this quiz are answered
    const quizContainer = document.getElementById(quizId);
    if (!quizContainer) return;

    const allQuestions = quizContainer.querySelectorAll('.quiz-question');
    const allAnswered = Array.from(allQuestions).every(q => q.dataset.answered === 'true');

    if (allAnswered) {
        // Recount: check which buttons have the red highlight (wrong answers)
        let wrongCount = 0;
        allQuestions.forEach(q => {
            const buttons = q.querySelectorAll('.quiz-option');
            let hasWrong = false;
            buttons.forEach(btn => {
                if (btn.classList.contains('bg-red-500/20')) hasWrong = true;
            });
            if (hasWrong) wrongCount++;
        });

        const correct = allQuestions.length - wrongCount;
        const total = allQuestions.length;
        const pct = Math.round((correct / total) * 100);

        // Calculate XP: 5 XP per correct answer, bonus 10 XP for perfect score
        const xpEarned = (correct * 5) + (pct === 100 ? 10 : 0);

        // Determine performance tier
        let perfEmoji, perfLabel, perfColor, perfBorder;
        if (pct >= 80) {
            perfEmoji = '🎉'; perfLabel = 'Excellent!'; perfColor = 'text-emerald-400'; perfBorder = 'border-emerald-500';
        } else if (pct >= 50) {
            perfEmoji = '👍'; perfLabel = 'Good Effort!'; perfColor = 'text-brandVioletLight'; perfBorder = 'border-brandViolet';
        } else {
            perfEmoji = '📚'; perfLabel = 'Keep Studying!'; perfColor = 'text-red-400'; perfBorder = 'border-red-500';
        }

        // Show rich performance result card
        const resultDiv = document.getElementById(`${quizId}-result`);
        if (resultDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.className = `mt-4 rounded-2xl border ${perfBorder} overflow-hidden`;
            resultDiv.innerHTML = `
                <div class="bg-bgMain p-4">
                    <!-- Score header -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${perfEmoji}</span>
                            <div>
                                <p class="font-black text-white text-base leading-tight">${perfLabel}</p>
                                <p class="text-xs text-textMuted font-medium">${correct} of ${total} correct</p>
                            </div>
                        </div>
                        <!-- Score circle -->
                        <div class="w-14 h-14 rounded-full flex items-center justify-center border-4 ${perfBorder} ${perfColor}">
                            <span class="font-black text-lg leading-none">${pct}%</span>
                        </div>
                    </div>
                    <!-- XP bar -->
                    <div class="bg-cardBg rounded-xl p-3 mb-3">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-xs font-bold text-textMuted uppercase tracking-wider">XP Earned</span>
                            <span class="text-xs font-black text-yellow-400">+${xpEarned} XP ⚡</span>
                        </div>
                        <div class="w-full bg-bgMain h-2 rounded-full overflow-hidden">
                            <div class="h-full rounded-full bg-gradient-to-r from-yellow-400 to-brandVioletLight transition-all duration-1000" style="width: ${Math.min((xpEarned / 35) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <!-- Score breakdown chips -->
                    <div class="flex gap-2 flex-wrap mb-3">
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">${correct} ✓ Correct</span>
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">${wrongCount} ✗ Wrong</span>
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">+${xpEarned} XP</span>
                    </div>
                    <!-- CTA -->
                    <button onclick="switchTab('leaderboard')" class="w-full py-2 rounded-xl bg-gradient-to-r from-brandViolet to-brandVioletLight hover:opacity-90 text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-glow-violet">
                        <i class="fa-solid fa-crown"></i> View Leaderboard
                    </button>
                </div>
            `;
        }

        // Record score for weekly performance chart + award XP
        recordQuizScore(correct, total);
        awardQuizXP(xpEarned);
        showToast(`Quiz complete! ${pct}% — +${xpEarned} XP earned! 🏆`);
    }
}

// Allow Enter to send message
document.addEventListener("DOMContentLoaded", () => {
    // ... existing DOMContentLoaded logic ...

    const aiInput = document.getElementById('aiTutorInput');
    if (aiInput) {
        aiInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAITutorMessage();
            }
        });
    }

    const chatbotInput = document.getElementById('chatbotInput');
    if (chatbotInput) {
        chatbotInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatbotMessage();
            }
        });
    }

    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search..."]');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const query = this.value.trim().toLowerCase();

            // If searching for specific sections, don't filter subjects just yet
            if (query === 'weekly' || query.includes('performance') || query.includes('activity') || query.includes('heatmap')) {
                return;
            }
            filterSubjects(query);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const query = this.value.trim().toLowerCase();
                if (query) {
                    handleSearchAction(query);
                }
            }
        });

        // Also make the search icon clickable
        const searchIcon = searchInput.previousElementSibling;
        if (searchIcon) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', () => {
                const query = searchInput.value.trim().toLowerCase();
                if (query) {
                    handleSearchAction(query);
                } else {
                    searchInput.focus();
                }
            });
        }
    }

    function handleSearchAction(query) {
        // 1. Tab Navigation keywords
        const tabs = {
            'dashboard': ['dashboard', 'home', 'main', 'overview'],
            'planner': ['planner', 'smart', 'calendar', 'schedule', 'plan'],
            'tutor': ['tutor', 'ai', 'chat', 'bot', 'studyai'],
            'analytics': ['analytics', 'stats', 'statistics', 'performance', 'activity', 'heatmap'],
            'focus': ['focus', 'distraction', 'blocker', 'timer'],
            'leaderboard': ['leaderboard', 'rank', 'ranking']
        };

        let targetTab = null;
        for (const [tabId, keywords] of Object.entries(tabs)) {
            // Match if query is exactly the tab name or if the query contains a broad keyword
            if (keywords.some(k => query === k || (query.length > 3 && query.includes(k)))) {
                targetTab = tabId;
                break;
            }
        }

        // 2. Generic Search in all views for specific headings (h1, h2, h3, h4)
        const headings = Array.from(document.querySelectorAll('.view-section h1, .view-section h2, .view-section h3, .view-section h4, .view-section .text-lg, .view-section .text-xl'));
        let bestHeading = null;
        for (const el of headings) {
            const text = el.textContent.toLowerCase().trim();
            if (text.includes(query) && query.length >= 3) {
                bestHeading = el;
                break;
            }
        }

        if (bestHeading) {
            const viewSection = bestHeading.closest('.view-section');
            if (viewSection && viewSection.id) {
                const tabId = viewSection.id.replace('view-', '');
                showToast(`Scrolling to: ${bestHeading.textContent.trim()} `);

                // Only switch tabs if not currently active
                if (viewSection.classList.contains('hidden')) {
                    switchTab(tabId);
                }

                setTimeout(() => {
                    bestHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the closest card container or the element itself
                    const card = bestHeading.closest('.card-bubbly, .bg-cardBg, .glass-panel') || bestHeading.parentElement;
                    highlightElement(card);
                }, 100);
                return;
            }
        }

        // 3. Fallback to Tab Switching if it matches a tab keyword but not a specific heading
        if (targetTab) {
            showToast(`Switching to ${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}...`);
            switchTab(targetTab);
            return;
        }

        // 4. Default to filtering subjects on the Dashboard
        showToast(`Searched Curriculum for: "${query}"`);
        const dashView = document.getElementById('view-dashboard');
        if (dashView && dashView.classList.contains('hidden')) {
            switchTab('dashboard');
        }
        setTimeout(() => {
            filterSubjects(query);
            const container = document.getElementById('subjectListContainer');
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightElement(container.parentElement);
            }
        }, 100);
    }

    function highlightElement(el) {
        if (!el) return;
        const oldGlow = el.style.boxShadow;
        const oldTransform = el.style.transform;

        el.style.boxShadow = '0px 0px 30px rgba(138, 43, 226, 0.8)';
        el.style.transform = 'scale(1.02)';

        setTimeout(() => {
            el.style.boxShadow = oldGlow;
            el.style.transform = oldTransform;
        }, 1500);
    }

    // Helper function to filter subjects
    function filterSubjects(query) {
        const container = document.getElementById('subjectListContainer');
        if (!container) return; // Currently only filtering subjects on dashboard

        if (!query) {
            renderSubjectsList(); // Render all if no query
            return;
        }

        const filteredSubjects = subjects.filter(sub =>
            sub.name.toLowerCase().includes(query)
        );

        if (filteredSubjects.length === 0) {
            container.innerHTML = `< div class="p-4 text-center text-textMuted font-medium border border-brandGray rounded-3xl bg-bgMain" > No subjects found matching "${query}"</div > `;
        } else {
            // Re-render only the filtered subjects
            renderFilteredSubjectsList(filteredSubjects, container);
        }
    }

    // Extracted render logic for filtered subjects
    function renderFilteredSubjectsList(filteredSubjects, container) {
        container.innerHTML = '';
        filteredSubjects.forEach((sub, index) => {
            // Find original index for removal
            const originalIndex = subjects.findIndex(s => s.name === sub.name);

            let bgHex, textHex, borderHex, labelBg, iconColor;
            if (sub.status === 'weak') {
                bgHex = '#21182B'; textHex = '#B084FF'; borderHex = '#3A2045'; labelBg = '#8A2BE2'; iconColor = 'text-brandVioletLight';
            } else if (sub.status === 'strong') {
                bgHex = '#182B24'; textHex = '#00E5FF'; borderHex = '#204538'; labelBg = '#00B57E'; iconColor = 'text-emerald-500';
            } else {
                bgHex = '#2B2418'; textHex = '#FF9900'; borderHex = '#453520'; labelBg = '#FF9900'; iconColor = 'text-brandOrange';
            }

            container.innerHTML += `
                < div class="group flex items-center justify-between p-4 rounded-3xl border hover:shadow-md transition-all duration-300" style = "background-color: ${bgHex}; border-color: ${borderHex};" >
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-cardBg border border-brandGray flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${iconColor} text-xl">
                            <i class="fa-solid ${sub.icon || 'fa-book'}"></i>
                        </div>
                        <div>
                            <h4 class="font-display font-bold text-textMain text-lg leading-none mb-1">${sub.name}</h4>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] uppercase font-black tracking-wider text-white px-2 py-0.5 rounded-md" style="background-color: ${labelBg};">${sub.status}</span>
                                <span class="text-xs font-bold text-textMuted whitespace-nowrap"><i class="fa-solid fa-arrow-trend-up"></i>  ${sub.mastery}% mastery</span>
                            </div>
                        </div>
                    </div>
                    <div class="hidden sm:flex text-right flex-col items-end mr-4">
                        <div class="flex gap-1">
                            ${[...Array(5)].map((_, i) => `<div class="w-2 h-6 rounded-full ${i < sub.difficulty ? 'bg-brandViolet' : 'bg-[#2A2A35]'}"></div>`).join('')}
                        </div>
                        <span class="text-[10px] font-bold text-textMuted uppercase mt-1">Level ${sub.difficulty}</span>
                    </div>
                    
                    <button onclick="removeSubject(${originalIndex})" class="ml-auto flex items-center justify-center w-10 h-10 rounded-xl bg-bgMain hover:bg-[#FF4D4D]/20 border border-brandGray hover:border-[#FF4D4D] text-textMuted hover:text-[#FF4D4D] transition-all" title="Remove Subject">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div >
                `;
        });
    }

    // Notification functionality
    const notifBtn = document.getElementById('notificationBtn');
    const notifDropdown = document.getElementById('notificationDropdown');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent clicking from immediately propagating to document
            notifDropdown.classList.toggle('hidden');

            // Remove the red dot indicator after click
            const dot = document.getElementById('notificationDot');
            if (dot) {
                dot.style.display = 'none';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!notifBtn.contains(event.target) && !notifDropdown.contains(event.target)) {
                notifDropdown.classList.add('hidden');
            }
        });
    }

    // Agenda Tabs Logic (Today, Week, Month)
    const agendaTabs = document.querySelectorAll('.agenda-tab');
    agendaTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Reset all to inactive state
            agendaTabs.forEach(t => {
                t.classList.remove('bg-brandViolet', 'text-white', 'active');
                t.classList.add('text-textMuted');
            });

            // Set clicked to active state
            tab.classList.remove('text-textMuted');
            tab.classList.add('bg-brandViolet', 'text-white', 'active');

            showToast(`Switched Agenda view to: ${tab.textContent.trim()} `);
        });
    });
});

// ==========================================
// Heatmap Logic
// ==========================================
function togglePlatformModal() {
    const modal = document.getElementById('platformLinkModal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        // Pre-fill if exists
        document.getElementById('lcHandle').value = localStorage.getItem('study_lcHandle') || '';
        document.getElementById('cfHandle').value = localStorage.getItem('study_cfHandle') || '';
        document.getElementById('gfgHandle').value = localStorage.getItem('study_gfgHandle') || '';
    } else {
        modal.classList.add('hidden');
    }
}

async function savePlatforms() {
    const lc = document.getElementById('lcHandle').value.trim();
    const cf = document.getElementById('cfHandle').value.trim();
    const gfg = document.getElementById('gfgHandle').value.trim();

    localStorage.setItem('study_lcHandle', lc);
    localStorage.setItem('study_cfHandle', cf);
    localStorage.setItem('study_gfgHandle', gfg);

    togglePlatformModal();
    showToast("Platforms saved! Syncing data...");

    await fetchPlatformDataAndRender();
}

async function fetchPlatformDataAndRender() {
    const lc = localStorage.getItem('study_lcHandle') || '';
    const cf = localStorage.getItem('study_cfHandle') || '';
    const gfg = localStorage.getItem('study_gfgHandle') || '';

    // If no handles, just render default
    if (!lc && !cf && !gfg) {
        renderHeatmap(null);
        return;
    }

    const container = document.getElementById('learningHeatmapContainer');
    const loader = document.getElementById('heatmapLoading');

    container.classList.add('hidden');
    loader.classList.remove('hidden');
    loader.style.display = 'flex';

    try {
        const queryParams = new URLSearchParams();
        if (lc) queryParams.append('leetcode', lc);
        if (cf) queryParams.append('codeforces', cf);
        if (gfg) queryParams.append('gfg', gfg);

        const response = await fetch(`http://localhost:5001/api/platforms/heatmap?${queryParams.toString()}`);
        const data = await response.json();

        if (data.success) {
            renderHeatmap(data.data);
            recalculateStreak(data.data);
        } else {
            throw new Error(data.error || "Unknown API error");
        }
    } catch (err) {
        console.error("Failed to fetch platform data", err);
        showToast("Error syncing platforms. Showing local data.");
        renderHeatmap(null);
    } finally {
        loader.classList.add('hidden');
        loader.style.display = 'none';
        container.classList.remove('hidden');
    }
}

// Convert Date object to YYYY-MM-DD
function toDateStr(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${day}`;
}

function recalculateStreak(heatmapData) {
    if (!heatmapData) return;

    // Calculate streak tracking backward from today/yesterday
    let currentStreak = 0;
    let checkDate = new Date();

    // If they haven't submitted today, check if they submitted yesterday to maintain streak
    let todayStr = toDateStr(checkDate);
    if (!heatmapData[todayStr] || heatmapData[todayStr] === 0) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = toDateStr(yesterday);
        if (!heatmapData[yesterdayStr] || heatmapData[yesterdayStr] === 0) {
            // Streak broken
            updateDashboardStreak(0);
            return;
        } else {
            // Started check from yesterday
            checkDate = yesterday;
        }
    }

    while (true) {
        let dateStr = toDateStr(checkDate);
        if (heatmapData[dateStr] && heatmapData[dateStr] > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    // Save and Update visual UI element
    updateDashboardStreak(currentStreak);
}

function updateDashboardStreak(streakCount) {
    localStorage.setItem('study_dailyStreak', streakCount);

    // Find the streak element in Dashboard 
    // Uses generic selector since ID wasn't explicitly set for streak number
    const h2Elements = document.querySelectorAll('h2.text-4xl.font-display');
    h2Elements.forEach(h2 => {
        if (h2.textContent.includes('Day')) {
            // Simple heuristic to find the streak widget. Ideally give it an ID.
            if (h2.parentElement.innerHTML.includes('fa-fire')) {
                h2.innerHTML = `${streakCount} Day${streakCount !== 1 ? 's' : ''}`;
            }
        }
    });

    if (window.updateDashboardStats) {
        window.updateDashboardStats(); // call existing updater if it syncs
    }
}

function renderHeatmap(actualData = null) {
    const container = document.getElementById('learningHeatmapContainer');
    if (!container) return;

    container.innerHTML = '';
    const totalDays = 105; // 15 weeks * 7 days

    // Generate dates array starting from (today - totalDays) to today
    const dates = [];
    for (let i = totalDays - 1; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(toDateStr(d));
    }

    const currentStreak = parseInt(localStorage.getItem('study_dailyStreak')) || 0;

    for (let i = 0; i < totalDays; i++) {
        let blockStyles = 'bg-cardBg'; // Default empty state
        let titleText = dates[i];

        if (actualData) {
            // Real Data Mode
            const count = actualData[dates[i]] || 0;
            titleText = `${count} submissions on ${dates[i]}`;

            if (count > 0) {
                if (count > 5) {
                    blockStyles = 'bg-[#FF00A6] shadow-[0_0_8px_rgba(255,0,166,0.6)]'; // Highest (Pink)
                } else if (count > 2) {
                    blockStyles = 'bg-brandViolet shadow-[0_0_5px_rgba(138,43,226,0.6)]'; // Med
                } else {
                    blockStyles = 'bg-brandViolet/60'; // Low
                }
            }
        } else {
            // Local Data Mode — combine app activity + focus sessions
            const activityHistory = JSON.parse(localStorage.getItem('study_activityHistory') || '{}');
            const focusHistory = JSON.parse(localStorage.getItem('study_focusHistory') || '{}');

            const visits = activityHistory[dates[i]] || 0;  // times opened app
            const focuses = focusHistory[dates[i]] || 0;  // focus sessions
            const totalActivity = visits + focuses;

            if (totalActivity > 0) {
                // Build a human-readable tooltip
                const parts = [];
                if (visits > 0) parts.push(`${visits} visit${visits > 1 ? 's' : ''}`);
                if (focuses > 0) parts.push(`${focuses} focus session${focuses > 1 ? 's' : ''}`);
                titleText = `${dates[i]} — ${parts.join(', ')}`;

                // Colour intensity: brightest = very active, mid = some activity, dim = just visited
                if (focuses >= 2 || totalActivity >= 4) {
                    blockStyles = 'bg-[#FF00A6] shadow-[0_0_8px_rgba(255,0,166,0.6)]'; // Very active
                } else if (focuses >= 1 || totalActivity >= 2) {
                    blockStyles = 'bg-brandViolet shadow-[0_0_5px_rgba(138,43,226,0.6)]'; // Active
                } else {
                    blockStyles = 'bg-brandViolet/40'; // Just visited — faint
                }
            } else {
                titleText = `${dates[i]} — no activity`;
            }
        }

        const square = document.createElement('div');
        // using tooltips via title
        square.title = titleText;
        square.className = `w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${blockStyles} border border-brandGray transition-colors duration-200 hover:scale-125 hover:z-10 cursor-pointer`;
        container.appendChild(square);
    }
}

// Ensure heatmap fetches initial real data when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    // Adding timeout so other script initializations process first
    setTimeout(() => {
        recordDailyActivity(); // Mark today as an active day in the heatmap
        fetchPlatformDataAndRender();
        renderLeaderboard(); // Initial leaderboard render
    }, 1000);
});

// ==========================================
// Daily Activity Tracker (for Heatmap)
// ==========================================

/**
 * Record today as an active day in study_activityHistory.
 * Each time the user opens the app, that day's counter increments (max once per hour
 * to avoid inflating on multi-tab refreshes).
 */
function recordDailyActivity() {
    const todayStr = toDateStr(new Date());
    const lastRecordedHour = localStorage.getItem('study_lastActivityHour') || '';
    const currentHour = `${todayStr}-${new Date().getHours()}`;

    // Only count once per hour to avoid spamming on refresh
    if (lastRecordedHour === currentHour) return;

    let activityHistory = JSON.parse(localStorage.getItem('study_activityHistory') || '{}');
    activityHistory[todayStr] = (activityHistory[todayStr] || 0) + 1;
    localStorage.setItem('study_activityHistory', JSON.stringify(activityHistory));
    localStorage.setItem('study_lastActivityHour', currentHour);
}

// ==========================================
// XP & Leaderboard System
// ==========================================

/**
 * Award XP to the user and refresh leaderboard.
 * @param {number} xp - Amount of XP to award
 */
function awardQuizXP(xp) {
    if (!xp || xp <= 0) return;
    let totalXP = parseInt(localStorage.getItem('study_totalXP') || '0');
    totalXP += xp;
    localStorage.setItem('study_totalXP', totalXP);

    // Save XP history for weekly tracking
    const todayStr = toDateStr(new Date());
    let xpHistory = JSON.parse(localStorage.getItem('study_xpHistory') || '{}');
    xpHistory[todayStr] = (xpHistory[todayStr] || 0) + xp;
    localStorage.setItem('study_xpHistory', JSON.stringify(xpHistory));

    renderLeaderboard();
}

/**
 * Returns the full peer + user dataset sorted by XP descending.
 */
function getLeaderboardData() {
    const userXP = parseInt(localStorage.getItem('study_totalXP') || '0');

    // Get this week's XP for weekly filter
    let xpHistory = JSON.parse(localStorage.getItem('study_xpHistory') || '{}');
    let weeklyUserXP = 0;
    for (let i = 0; i < 7; i++) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        weeklyUserXP += (xpHistory[toDateStr(d)] || 0);
    }

    // Fixed dummy peers (realistic study group)
    const peers = [
        { name: 'Alex M.', xp: 420, weeklyXP: 85, avatarBg: 'E23030', avatarName: 'Alex+M' },
        { name: 'Sarah J.', xp: 380, weeklyXP: 72, avatarBg: 'E230BE', avatarName: 'Sarah+J' },
        { name: 'David W.', xp: 310, weeklyXP: 60, avatarBg: '30A0E2', avatarName: 'David+W' },
        { name: 'Emily T.', xp: 270, weeklyXP: 50, avatarBg: 'E28A30', avatarName: 'Emily+T' },
        { name: 'James K.', xp: 230, weeklyXP: 45, avatarBg: '30E280', avatarName: 'James+K' },
        { name: 'Priya S.', xp: 190, weeklyXP: 38, avatarBg: 'A030E2', avatarName: 'Priya+S' },
        { name: 'Carlos R.', xp: 160, weeklyXP: 30, avatarBg: 'E2C030', avatarName: 'Carlos+R' },
        { name: 'Mei L.', xp: 120, weeklyXP: 22, avatarBg: '30E2E2', avatarName: 'Mei+L' },
        { name: 'Omar F.', xp: 90, weeklyXP: 15, avatarBg: 'E26030', avatarName: 'Omar+F' },
    ];

    const user = {
        name: 'Pritam K. Prem',
        xp: userXP,
        weeklyXP: weeklyUserXP,
        avatarBg: '4318FF',
        avatarName: 'Pritam+Kumar',
        isUser: true
    };

    const all = [...peers.map(p => ({ ...p, isUser: false })), user];
    return all.sort((a, b) => b.xp - a.xp);
}

/**
 * Render the leaderboard (podium + list) dynamically into #view-leaderboard.
 */
function renderLeaderboard(filter = 'alltime') {
    const container = document.getElementById('leaderboard-dynamic-area');
    if (!container) return;

    const data = getLeaderboardData();
    const userXP = parseInt(localStorage.getItem('study_totalXP') || '0');
    const userEntry = data.find(d => d.isUser);
    const userRank = data.indexOf(userEntry) + 1;
    const totalQuizzes = Object.keys(JSON.parse(localStorage.getItem('study_quizWeekly') || '{}')).length;

    // Rank badge
    let rankBadge = 'Bronze 🥉';
    let rankColor = 'text-orange-400';
    if (userXP >= 500) { rankBadge = 'Diamond 💎'; rankColor = 'text-cyan-400'; }
    else if (userXP >= 200) { rankBadge = 'Gold 🥇'; rankColor = 'text-yellow-400'; }
    else if (userXP >= 100) { rankBadge = 'Silver 🥈'; rankColor = 'text-gray-300'; }

    // Render user stats card + podium + list
    const top3 = data.slice(0, 3);
    const rest = data.slice(3);

    const podiumHeights = ['h-32 sm:h-40', 'h-28 sm:h-32', 'h-24 sm:h-28'];
    const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd visual order
    const podiumBorders = ['border-gray-400', 'border-yellow-400', 'border-amber-600'];
    const podiumHeightArr = [podiumHeights[1], podiumHeights[0], podiumHeights[2]];
    const podiumRanks = [2, 1, 3];
    const podiumRankColors = ['text-gray-400', 'text-yellow-500', 'text-amber-600'];
    const podiumRankBg = ['from-gray-400/10', 'from-yellow-400/10', 'from-amber-600/10'];
    const crownEmoji = ['', '👑', ''];

    let podiumHTML = `<div class="flex justify-center items-end gap-3 sm:gap-6 mb-8 mt-4 px-2">`;

    [0, 1, 2].forEach(vi => {
        const entry = podiumOrder[vi];
        if (!entry) return;
        const isU = entry.isUser;
        const aUrl = `https://ui-avatars.com/api/?name=${entry.avatarName}&background=${entry.avatarBg}&color=fff&rounded=true`;
        const sizeClasses = vi === 1 ? 'w-32 sm:w-44' : 'w-24 sm:w-32';
        const avatarSize = vi === 1 ? 'w-20 h-20 md:w-24 md:h-24' : 'w-14 sm:w-16 h-14 sm:h-16';
        const avatarBorder = vi === 1 ? podiumBorders[podiumRanks[vi] - 1] : `border-cardBg`;
        const negMargin = vi === 1 ? '-mt-10 sm:-mt-12 z-10' : '-mb-7 sm:-mb-8 z-10';
        const crown = crownEmoji[vi];

        if (vi === 1) {
            // First place (center, taller)
            podiumHTML += `
            <div class="flex flex-col items-center ${sizeClasses} relative group">
                ${crown ? `<div class="text-3xl mb-1">${crown}</div>` : ''}
                <img src="${aUrl}" class="${avatarSize} rounded-full border-4 ${podiumBorders[podiumRanks[vi] - 1]} shadow-[0_0_25px_rgba(250,204,21,0.5)] z-20 group-hover:scale-110 transition-transform relative ${isU ? 'ring-4 ring-white/30' : ''}">
                <div class="absolute top-[60px] md:top-[68px] left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-bgMain z-30">#1</div>
                <div class="w-full ${podiumHeightArr[vi]} bg-gradient-to-t from-bgMain ${podiumRankBg[vi]} rounded-t-2xl border-t-4 ${podiumBorders[podiumRanks[vi] - 1]} flex flex-col justify-end pb-3 items-center -mt-10 z-10">
                    <p class="text-sm font-black ${podiumRankColors[vi]} flex items-center gap-1 text-center leading-tight">${entry.name} ${isU ? '<i class="fa-solid fa-circle-check text-xs"></i>' : ''}</p>
                    <p class="text-xs font-black mt-1 ${podiumRankColors[vi]} bg-yellow-400/20 px-2.5 py-0.5 rounded">${entry.xp} XP</p>
                </div>
            </div>`;
        } else {
            podiumHTML += `
            <div class="flex flex-col items-center ${sizeClasses} group">
                <img src="${aUrl}" class="${avatarSize} rounded-full border-4 border-cardBg shadow-lg ${negMargin} group-hover:scale-110 transition-transform ${isU ? 'ring-4 ring-brandViolet/50' : ''}">
                <div class="w-full ${podiumHeightArr[vi]} bg-gradient-to-t from-bgMain ${podiumRankBg[vi]} rounded-t-2xl border-t-4 ${podiumBorders[podiumRanks[vi] - 1]} flex flex-col justify-end pb-3 items-center">
                    <span class="text-2xl font-black ${podiumRankColors[vi]}">${podiumRanks[vi]}</span>
                </div>
                <p class="mt-2 font-bold text-textMain text-sm text-center leading-tight">${entry.name}</p>
                <p class="text-xs font-bold ${podiumRankColors[vi]} bg-brandVioletLight/10 px-2 py-0.5 rounded mt-1">${entry.xp} XP</p>
            </div>`;
        }
    });
    podiumHTML += `</div>`;

    // List for ranks 4+
    let listHTML = `<div class="card-bubbly bg-cardBg rounded-3xl p-4 sm:p-6 border-2 border-brandGray shadow-sm">
        <div class="flex items-center justify-between p-4 border-b border-brandGray/50 mb-2">
            <span class="text-xs font-black text-textMuted uppercase tracking-widest">Rank</span>
            <span class="text-xs font-black text-textMuted uppercase tracking-widest">Score</span>
        </div>`;

    rest.forEach((entry, i) => {
        const rank = i + 4;
        const aUrl = `https://ui-avatars.com/api/?name=${entry.avatarName}&background=${entry.avatarBg}&color=fff`;
        const isU = entry.isUser;
        listHTML += `
        <div class="flex items-center justify-between p-4 ${isU ? 'bg-brandViolet/10 rounded-2xl border border-brandViolet/30' : 'hover:bg-bgMain rounded-2xl'} transition-colors cursor-pointer group" ${isU ? 'id="leaderboard-user-row"' : ''}>
            <div class="flex items-center gap-4">
                <span class="font-black ${isU ? 'text-brandVioletLight' : 'text-textMuted'} w-6 text-center">${rank}</span>
                <img src="${aUrl}" class="w-10 h-10 rounded-full shadow-sm ${isU ? 'ring-2 ring-brandViolet' : ''}">
                <span class="font-bold ${isU ? 'text-white' : 'text-textMain'} group-hover:text-brandVioletLight transition-colors">${entry.name} ${isU ? '<span class="text-[10px] bg-brandViolet px-1.5 py-0.5 rounded font-black ml-1">YOU</span>' : ''}</span>
            </div>
            <span class="font-bold ${isU ? 'text-brandVioletLight' : 'text-textMuted'} group-hover:text-white transition-colors">${entry.xp} XP</span>
        </div>`;
    });

    // If user is in top 3, still highlight in list section header
    listHTML += `</div>`;

    // User stats summary card
    const statsHTML = `
        <div class="card-bubbly bg-gradient-to-br from-brandViolet/20 to-brandVioletLight/10 border-2 border-brandViolet/40 p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-4">
                <img src="https://ui-avatars.com/api/?name=Pritam+Kumar&background=4318FF&color=fff&rounded=true" class="w-14 h-14 rounded-full border-4 border-brandViolet shadow-glow-violet">
                <div>
                    <p class="font-black text-white text-lg leading-tight">Pritam K. Prem</p>
                    <p class="text-xs font-bold ${rankColor}">${rankBadge} &nbsp;|&nbsp; Rank #${userRank}</p>
                </div>
            </div>
            <div class="flex gap-4 flex-wrap">
                <div class="text-center">
                    <p class="text-2xl font-black text-white">${userXP}</p>
                    <p class="text-xs font-bold text-textMuted uppercase">Total XP</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-black text-white">#${userRank}</p>
                    <p class="text-xs font-bold text-textMuted uppercase">Rank</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-black text-white">${totalQuizzes}</p>
                    <p class="text-xs font-bold text-textMuted uppercase">Quizzes</p>
                </div>
            </div>
        </div>`;

    container.innerHTML = statsHTML + podiumHTML + listHTML;
}