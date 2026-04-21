document.addEventListener('DOMContentLoaded', () => {
    let electionData = null;
    let currentQuizIndex = 0;
    let score = 0;

    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const quizIntro = document.getElementById('quiz-intro');
    const quizContainer = document.getElementById('quiz-container');
    const questionArea = document.getElementById('question-area');
    const quizProgress = document.getElementById('quiz-progress');
    const progressFill = document.getElementById('progress-fill');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizResults = document.getElementById('quiz-results');
    const scoreDisplay = document.getElementById('score');
    const scoreMessage = document.getElementById('score-message');
    const startQuizBtn = document.getElementById('start-quiz');
    const restartQuizBtn = document.getElementById('restart-quiz');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme Logic
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            themeToggle.textContent = '🌙 Dark Mode';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '☀️ Light Mode';
        }
    });

    // Load Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            electionData = data;
        })
        .catch(err => console.error('Error loading data:', err));

    // Chatbot Logic
    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'user' ? 'user-msg' : 'bot-msg';
        
        if (sender === 'user') {
            msgDiv.textContent = text;
            chatDisplay.appendChild(msgDiv);
        } else {
            // Typing effect for bot
            msgDiv.textContent = '';
            chatDisplay.appendChild(msgDiv);
            let i = 0;
            const speed = 30; // typing speed in ms
            function typeWriter() {
                if (i < text.length) {
                    msgDiv.textContent += text.charAt(i);
                    i++;
                    chatDisplay.scrollTop = chatDisplay.scrollHeight;
                    setTimeout(typeWriter, speed);
                }
            }
            typeWriter();
        }
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function getBotResponse(input) {
        if (!electionData) return "I'm still loading my knowledge. Please wait a moment.";
        
        const lowerInput = input.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;

        // Intent Detection
        let intent = "";
        if (lowerInput.includes("what")) intent = "definition";
        else if (lowerInput.includes("how")) intent = "process";
        else if (lowerInput.includes("why")) intent = "explanation";
        else if (lowerInput.includes("when")) intent = "timeline";
        else if (lowerInput.includes("where")) intent = "location";

        for (const entry of electionData.knowledge_base) {
            let matchCount = 0;
            for (const keyword of entry.keywords) {
                if (lowerInput.includes(keyword.toLowerCase())) {
                    matchCount++;
                }
            }
            
            if (matchCount > highestScore) {
                highestScore = matchCount;
                bestMatch = entry.answer;
            }
        }

        if (bestMatch && highestScore > 0) {
            // Apply Intent-based framing
            switch(intent) {
                case "definition":
                    return `Here is the definition: ${bestMatch}`;
                case "process":
                    return `Here is the step-by-step process: ${bestMatch}`;
                case "explanation":
                    return `Here is the explanation: ${bestMatch}`;
                case "timeline":
                    return `Here is the timeline/date information: ${bestMatch}`;
                case "location":
                    return `Here is the location/process information: ${bestMatch}`;
                default:
                    return bestMatch;
            }
        }

        return "I'm sorry, I don't have information on that. Try asking about voting, EVM, NOTA, or registration!";
    }

    function handleSend() {
        const text = userInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            userInput.value = '';
            // Show a small delay before bot starts typing
            setTimeout(() => {
                const response = getBotResponse(text);
                addMessage(response, 'bot');
            }, 600);
        }
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Quiz Logic
    let quizQuestions = [];
    const QUIZ_LENGTH = 10;

    function showQuestion() {
        const quiz = quizQuestions[currentQuizIndex];
        const totalQuestions = quizQuestions.length;
        
        // Update progress
        quizProgress.textContent = `Question ${currentQuizIndex + 1} of ${totalQuestions}`;
        progressFill.style.width = `${((currentQuizIndex + 1) / totalQuestions) * 100}%`;
        
        quizFeedback.classList.add('hidden');
        quizFeedback.textContent = '';
        
        questionArea.innerHTML = `
            <div class="quiz-question">
                <p>${quiz.question}</p>
            </div>
            <div class="options">
                ${quiz.options.map((opt, i) => `
                    <button class="quiz-option" data-index="${i}">${opt}</button>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedBtn = e.target;
                const selectedIndex = parseInt(selectedBtn.dataset.index);
                const isCorrect = selectedIndex === quiz.answer;
                
                // Disable all buttons after selection
                document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
                
                if (isCorrect) {
                    score++;
                    selectedBtn.classList.add('correct');
                    showFeedback('Correct! Well done.', 'correct');
                } else {
                    selectedBtn.classList.add('incorrect');
                    // Highlight the correct answer
                    document.querySelector(`.quiz-option[data-index="${quiz.answer}"]`).classList.add('correct');
                    showFeedback('Incorrect. The correct answer is highlighted.', 'incorrect');
                }
                
                setTimeout(() => {
                    currentQuizIndex++;
                    if (currentQuizIndex < totalQuestions) {
                        showQuestion();
                    } else {
                        showResults();
                    }
                }, 1500);
            });
        });
    }

    function showFeedback(text, type) {
        quizFeedback.textContent = text;
        quizFeedback.className = `quiz-feedback ${type}`;
        quizFeedback.classList.remove('hidden');
    }

    function showResults() {
        quizContainer.classList.add('hidden');
        quizResults.classList.remove('hidden');
        scoreDisplay.textContent = score;
        const totalQuestions = quizQuestions.length;
        document.getElementById('score').nextSibling.textContent = `/${totalQuestions}`;
        
        let message = "";
        const percentage = (score / totalQuestions) * 100;
        if (percentage === 100) message = "Perfect score! You're an election expert! 🌟";
        else if (percentage >= 70) message = "Excellent! You have a great understanding of elections. 👍";
        else if (percentage >= 40) message = "Good job! You have a solid understanding of elections. 👍";
        else message = "Keep learning! Knowledge is power in a democracy. 📚";
        
        scoreMessage.textContent = message;
    }

    function startNewQuiz() {
        // Randomly select QUIZ_LENGTH questions
        quizQuestions = [...electionData.quiz]
            .sort(() => Math.random() - 0.5)
            .slice(0, QUIZ_LENGTH);
        
        currentQuizIndex = 0;
        score = 0;
        showQuestion();
    }

    startQuizBtn.addEventListener('click', () => {
        quizIntro.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        startNewQuiz();
    });

    restartQuizBtn.addEventListener('click', () => {
        quizResults.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        startNewQuiz();
    });
});
