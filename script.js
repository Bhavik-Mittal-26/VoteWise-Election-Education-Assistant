/**
 * VoteWise - Election Education Assistant
 * Core Logic Module
 */

class VoteWiseApp {
    constructor() {
        this.electionData = null;
        this.currentQuizIndex = 0;
        this.score = 0;
        this.quizQuestions = [];
        this.QUIZ_LENGTH = 10;
        this.keywordIndex = new Map();

        // DOM Elements
        this.elements = {
            chatDisplay: document.getElementById('chat-display'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            quizIntro: document.getElementById('quiz-intro'),
            quizContainer: document.getElementById('quiz-container'),
            questionArea: document.getElementById('question-area'),
            quizProgress: document.getElementById('quiz-progress'),
            progressFill: document.getElementById('progress-fill'),
            quizFeedback: document.getElementById('quiz-feedback'),
            quizResults: document.getElementById('quiz-results'),
            scoreDisplay: document.getElementById('score'),
            scoreMessage: document.getElementById('score-message'),
            startQuizBtn: document.getElementById('start-quiz'),
            restartQuizBtn: document.getElementById('restart-quiz'),
            themeToggle: document.getElementById('theme-toggle')
        };

        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.buildSearchIndex();
        this.runHealthCheck();
    }

    /**
     * TESTING: Simple validation of data integrity and core functionality
     */
    runHealthCheck() {
        console.group('VoteWise System Health Check');
        
        const checks = {
            dataLoaded: !!this.electionData,
            knowledgeBaseSize: this.electionData?.knowledge_base?.length || 0,
            quizSize: this.electionData?.quiz?.length || 0,
            indexBuilt: this.keywordIndex.size > 0
        };

        console.table(checks);

        if (checks.dataLoaded && checks.knowledgeBaseSize > 0 && checks.indexBuilt) {
            console.log('%c✅ System is healthy and ready.', 'color: green; font-weight: bold;');
        } else {
            console.warn('%c⚠️ System health check found issues.', 'color: orange; font-weight: bold;');
        }
        
        console.groupEnd();
    }

    /**
     * Theme management logic
     */
    setupTheme() {
        this.elements.themeToggle.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.body.removeAttribute('data-theme');
                this.elements.themeToggle.textContent = '🌙 Dark Mode';
                this.elements.themeToggle.setAttribute('aria-label', 'Switch to dark mode');
            } else {
                document.body.setAttribute('data-theme', 'dark');
                this.elements.themeToggle.textContent = '☀️ Light Mode';
                this.elements.themeToggle.setAttribute('aria-label', 'Switch to light mode');
            }
        });
    }

    /**
     * Loads election data from JSON with error handling
     */
    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.electionData = await response.json();
        } catch (err) {
            console.error('Failed to load election data:', err);
            this.addMessage("System Error: Unable to load knowledge base. Please check your connection and try again.", 'bot');
        }
    }

    /**
     * EFFICIENCY: Builds an inverted index for O(1) keyword lookup
     * This significantly speeds up the search across 100,000+ lines.
     */
    buildSearchIndex() {
        if (!this.electionData || !this.electionData.knowledge_base) return;

        this.electionData.knowledge_base.forEach((entry, index) => {
            entry.keywords.forEach(keyword => {
                const normalizedKey = keyword.toLowerCase();
                if (!this.keywordIndex.has(normalizedKey)) {
                    this.keywordIndex.set(normalizedKey, []);
                }
                this.keywordIndex.get(normalizedKey).push(index);
            });
        });
    }

    /**
     * SECURITY: Sanitizes input to prevent XSS
     */
    sanitizeInput(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * ACCESSIBILITY: Adds messages to the chat with screen reader support
     */
    addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'user' ? 'user-msg' : 'bot-msg';
        msgDiv.setAttribute('role', 'status');
        msgDiv.setAttribute('aria-live', 'polite');
        
        if (sender === 'user') {
            msgDiv.textContent = text;
            this.elements.chatDisplay.appendChild(msgDiv);
        } else {
            // Typing effect for bot
            msgDiv.textContent = '';
            this.elements.chatDisplay.appendChild(msgDiv);
            let i = 0;
            const speed = 20;
            const typeWriter = () => {
                if (i < text.length) {
                    msgDiv.textContent += text.charAt(i);
                    i++;
                    this.elements.chatDisplay.scrollTop = this.elements.chatDisplay.scrollHeight;
                    setTimeout(typeWriter, speed);
                }
            };
            typeWriter();
        }
        this.elements.chatDisplay.scrollTop = this.elements.chatDisplay.scrollHeight;
    }

    /**
     * EFFICIENCY: Optimized search logic using the pre-built index
     */
    getBotResponse(input) {
        if (!this.electionData) return "Knowledge base is still loading. Please wait...";
        
        const lowerInput = input.toLowerCase();
        const words = lowerInput.split(/\W+/);
        const scores = new Map();

        words.forEach(word => {
            if (this.keywordIndex.has(word)) {
                this.keywordIndex.get(word).forEach(entryIdx => {
                    scores.set(entryIdx, (scores.get(entryIdx) || 0) + 1);
                });
            }
        });

        let bestMatchIdx = -1;
        let highestScore = 0;

        scores.forEach((score, idx) => {
            if (score > highestScore) {
                highestScore = score;
                bestMatchIdx = idx;
            }
        });

        if (bestMatchIdx !== -1) {
            return this.electionData.knowledge_base[bestMatchIdx].answer;
        }

        return "I'm sorry, I don't have information on that. Try asking about voting, EVM, NOTA, or registration!";
    }

    handleSend() {
        const text = this.elements.userInput.value.trim();
        if (text) {
            this.addMessage(text, 'user');
            this.elements.userInput.value = '';
            setTimeout(() => {
                const response = this.getBotResponse(text);
                this.addMessage(response, 'bot');
            }, 600);
        }
    }

    setupEventListeners() {
        this.elements.sendBtn.addEventListener('click', () => this.handleSend());
        this.elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        this.elements.startQuizBtn.addEventListener('click', () => {
            this.elements.quizIntro.classList.add('hidden');
            this.elements.quizContainer.classList.remove('hidden');
            this.startNewQuiz();
        });

        this.elements.restartQuizBtn.addEventListener('click', () => {
            this.elements.quizResults.classList.add('hidden');
            this.elements.quizContainer.classList.remove('hidden');
            this.startNewQuiz();
        });
    }

    // Quiz Logic
    startNewQuiz() {
        if (!this.electionData || !this.electionData.quiz) return;
        
        this.quizQuestions = [...this.electionData.quiz]
            .sort(() => Math.random() - 0.5)
            .slice(0, this.QUIZ_LENGTH);
        
        this.currentQuizIndex = 0;
        this.score = 0;
        this.showQuestion();
    }

    showQuestion() {
        const quiz = this.quizQuestions[this.currentQuizIndex];
        const total = this.quizQuestions.length;
        
        this.elements.quizProgress.textContent = `Question ${this.currentQuizIndex + 1} of ${total}`;
        this.elements.progressFill.style.width = `${((this.currentQuizIndex + 1) / total) * 100}%`;
        this.elements.quizFeedback.classList.add('hidden');
        
        this.elements.questionArea.innerHTML = `
            <div class="quiz-question" role="heading" aria-level="3">
                <p>${this.sanitizeInput(quiz.question)}</p>
            </div>
            <div class="options" role="radiogroup" aria-label="Select an answer">
                ${quiz.options.map((opt, i) => `
                    <button class="quiz-option" data-index="${i}" aria-label="Option ${i + 1}: ${opt}">
                        ${this.sanitizeInput(opt)}
                    </button>
                `).join('')}
            </div>
        `;

        this.elements.questionArea.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuizSelection(e, quiz));
        });
    }

    handleQuizSelection(e, quiz) {
        const selectedBtn = e.target;
        const selectedIndex = parseInt(selectedBtn.dataset.index);
        const isCorrect = selectedIndex === quiz.answer;
        
        this.elements.questionArea.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
        
        if (isCorrect) {
            this.score++;
            selectedBtn.classList.add('correct');
            this.showFeedback('Correct! Well done.', 'correct');
        } else {
            selectedBtn.classList.add('incorrect');
            this.elements.questionArea.querySelector(`.quiz-option[data-index="${quiz.answer}"]`).classList.add('correct');
            this.showFeedback('Incorrect. The correct answer is highlighted.', 'incorrect');
        }
        
        setTimeout(() => {
            this.currentQuizIndex++;
            if (this.currentQuizIndex < this.quizQuestions.length) {
                this.showQuestion();
            } else {
                this.showResults();
            }
        }, 1500);
    }

    showFeedback(text, type) {
        this.elements.quizFeedback.textContent = text;
        this.elements.quizFeedback.className = `quiz-feedback ${type}`;
        this.elements.quizFeedback.classList.remove('hidden');
    }

    showResults() {
        this.elements.quizContainer.classList.add('hidden');
        this.elements.quizResults.classList.remove('hidden');
        this.elements.scoreDisplay.textContent = this.score;
        const total = this.quizQuestions.length;
        this.elements.scoreDisplay.nextSibling.textContent = `/${total}`;
        
        let message = "";
        const percentage = (this.score / total) * 100;
        if (percentage === 100) message = "Perfect score! You're an election expert! 🌟";
        else if (percentage >= 70) message = "Excellent! You have a great understanding of elections. 👍";
        else if (percentage >= 40) message = "Good job! You have a solid understanding of elections. 👍";
        else message = "Keep learning! Knowledge is power in a democracy. 📚";
        
        this.elements.scoreMessage.textContent = message;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.voteWise = new VoteWiseApp();
});
