document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    
    // Configuration
    const API_BASE_URL = 'http://localhost:3000';
    const MAX_HISTORY_ITEMS = 5;
    
    // Initialize features
    createTaskHistoryPanel();
    createQuickActions();
    setupVoiceCommands();
    
    // Utility Functions
    function formatTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }
    
    function addMessage(message, isUser = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', isUser ? 'user' : 'bot', 'fade-in');
        
        const icon = isUser ? 'fa-user' : 'fa-robot';
        const processedMessage = isUser ? message : formatBotResponse(message);
        
        messageElement.innerHTML = `
            <div class="message-content">
                <i class="fas ${icon} message-icon"></i>
                <div class="message-text">
                    ${processedMessage}
                </div>
            </div>
            <div class="message-time">${formatTime()}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to task history if it's a bot response with tasks
        if (!isUser && message.includes('•')) {
            addToTaskHistory(message);
        }
    }
    
    function showLoading() {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('message', 'bot', 'fade-in');
        loadingElement.id = 'loading-message';
        
        loadingElement.innerHTML = `
            <div class="message-content">
                <i class="fas fa-robot message-icon"></i>
                <div class="message-text">
                    <p><span class="loading-dots">...</span></p>
                </div>
            </div>
            <div class="message-time">${formatTime()}</div>
        `;
        
        chatMessages.appendChild(loadingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return loadingElement;
    }
    
    function removeLoading() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) loadingMessage.remove();
    }
    
    // Task History Feature
    function createTaskHistoryPanel() {
        const historyPanel = document.createElement('div');
        historyPanel.className = 'sidebar-section';
        historyPanel.innerHTML = `
            <h3><i class="fas fa-history"></i> Recent Tasks</h3>
            <div id="task-history-list"></div>
        `;
        document.querySelector('.sidebar').appendChild(historyPanel);
    }
    
    function addToTaskHistory(taskText) {
        const historyList = document.getElementById('task-history-list');
        if (!historyList) return;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = taskText.split('\n')[0].substring(0, 50) + 
                                 (taskText.length > 50 ? '...' : '');
        historyItem.onclick = () => fillCommand(taskText.split('\n')[0]);
        historyList.prepend(historyItem);
        
        if (historyList.children.length > MAX_HISTORY_ITEMS) {
            historyList.removeChild(historyList.lastChild);
        }
    }
    
    // Quick Actions Feature
    function createQuickActions() {
        const quickActions = document.createElement('div');
        quickActions.className = 'quick-actions';
        quickActions.innerHTML = `
            <button class="quick-action" onclick="fillCommand('Show my high priority tasks')">
                <i class="fas fa-exclamation"></i> Urgent
            </button>
            <button class="quick-action" onclick="fillCommand('What tasks are due today?')">
                <i class="far fa-calendar-day"></i> Today
            </button>
            <button class="quick-action" onclick="fillCommand('Add a reminder for tomorrow at 9am')">
                <i class="far fa-bell"></i> Reminder
            </button>
        `;
        document.querySelector('.chat-input').prepend(quickActions);
    }
    
    // Voice Command Feature
    function setupVoiceCommands() {
        const voiceBtn = document.createElement('button');
        voiceBtn.id = 'voice-btn';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Voice Command';
        document.querySelector('.chat-input form').prepend(voiceBtn);
        
        voiceBtn.addEventListener('click', async () => {
            try {
                const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                recognition.lang = 'en-US';
                
                voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                voiceBtn.style.background = 'var(--danger)';
                
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    userInput.value = transcript;
                    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    voiceBtn.style.background = '';
                };
                
                recognition.onerror = () => {
                    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    voiceBtn.style.background = '';
                    addMessage("Voice recognition failed. Please try again.");
                };
                
                recognition.start();
            } catch (err) {
                addMessage("Voice commands not supported in your browser");
            }
        });
    }
    
    // Response Formatting
    function formatBotResponse(text) {
        if (!text) return '';
        
        // Convert bullet points to interactive items
        text = text.replace(/\n• /g, '\n• ');
        
        // Format priority indicators
        text = text.replace(/Priority: (High|Medium|Low)/g, 
            'Priority: <span class="priority $1">$1</span>');
        
        // Format deadlines
        text = text.replace(/Deadline: (.*?)(\n|$)/g, 
            'Deadline: <span class="deadline">$1</span>$2');
            
        // Format status
        text = text.replace(/Status: (Not Started|In Progress|Completed)/g, 
            'Status: <span class="status $1">$1</span>');
        
        // Add checkboxes for action items
        text = text.replace(/• (.*?)(\n|$)/g, 
            '• <label class="task-item"><input type="checkbox" onchange="toggleTaskCompletion(this)"> $1</label>$2');
        
        // Convert newlines to HTML
        return text.split('\n').map(line => {
            if (line.trim() === '') return '';
            return line;
        }).join('<br>');
    }
    
    // Task Completion Handling
    window.toggleTaskCompletion = function(checkbox) {
        const taskItem = checkbox.parentElement;
        if (checkbox.checked) {
            taskItem.classList.add('completed-task');
            showConfetti();
        } else {
            taskItem.classList.remove('completed-task');
        }
    };
    
    // Confetti Effect
    function showConfetti() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1000';
        document.body.appendChild(canvas);
        
        const confettiSettings = { target: 'confetti-canvas', max: 150 };
        const confetti = new ConfettiGenerator(confettiSettings);
        confetti.render();
        
        setTimeout(() => {
            confetti.clear();
            canvas.remove();
        }, 3000);
    }
    
    // Form Submission
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessage(message, true);
        userInput.value = '';
        userInput.style.height = 'auto';
        
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Request failed');
            }
            
            const data = await response.json();
            removeLoading();
            addMessage(data.message || data.reply || "No response from server");
            
        } catch (error) {
            removeLoading();
            console.error('API Error:', error);
            addMessage(`Error: ${error.message || 'Failed to connect to server'}`);
        }
    });
    
    // Utility Functions
    window.fillCommand = function(command) {
        userInput.value = command;
        userInput.focus();
    };
    
    // Event Listeners
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });
    
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 200 ? this.scrollHeight : 200) + 'px';
    });
    
    // Initial Welcome Message
    addMessage("Hello! I'm your Task Management Assistant. I can help you with:\n• Creating tasks\n• Setting priorities\n• Managing deadlines\n• Organizing your workflow\n\nHow can I help you today?");
});

// Add CSS for new features
const style = document.createElement('style');
style.textContent = `
/* Loading Animation */
.loading-dots {
    animation: blink 1.4s infinite both;
}

/* Task History */
.history-item {
    padding: 8px 12px;
    margin: 5px 0;
    background: #f8fafc;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    border-left: 3px solid var(--primary);
}

.history-item:hover {
    background: #eef2ff;
    transform: translateX(5px);
}

/* Quick Actions */
.quick-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.quick-action {
    background: var(--primary-light);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 5px;
}

.quick-action:hover {
    background: var(--primary);
    transform: translateY(-2px);
}

/* Voice Command */
#voice-btn {
    background: var(--success);
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    color: white;
    cursor: pointer;
    margin-right: 10px;
    transition: all 0.2s;
}

/* Task Items */
.task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.task-item input[type="checkbox"] {
    cursor: pointer;
}

.task-item:hover {
    color: var(--primary);
}

.completed-task {
    text-decoration: line-through;
    color: var(--gray);
    opacity: 0.7;
}

/* Priority Indicators */
.priority {
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
}

.priority.High {
    background-color: #ff6b6b;
    color: white;
}

.priority.Medium {
    background-color: #feca57;
    color: black;
}

.priority.Low {
    background-color: #1dd1a1;
    color: white;
}

/* Deadline */
.deadline {
    color: #2e86de;
    font-weight: bold;
}

/* Status */
.status {
    font-weight: bold;
}

.status.Completed {
    color: #10ac84;
}

.status.In\\ Progress {
    color: #ff9f43;
}

.status.Not\\ Started {
    color: #576574;
}

/* Animations */
@keyframes blink {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);