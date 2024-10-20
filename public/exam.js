// exam.js
// Initialize timeLeft to 3600 seconds, equivalent to 60 minutes
let timeLeft = localStorage.getItem('timeLeft') ? parseInt(localStorage.getItem('timeLeft')) : 3600;
// Declare a variable to hold the timer interval
let timerInterval; 
let currentQuestionIndex = 0;
const questions = [
    "Question 1: What is the capital of France?",
    "Question 2: What is the largest planet in our solar system?",
    // Add more questions as needed
];

// Function to start the timer
function startTimer() {
    const timerElement = document.getElementById('time');
    timerInterval = setInterval(() => { 
        if (timeLeft <= 0) {
            clearInterval(timerInterval); 
            alert('Time is up! Submitting your exam.');
            submitExam();
        } else {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            timeLeft--;
            localStorage.setItem('timeLeft', timeLeft); // Save remaining time to localStorage
        }
    }, 1000);
}

// Function to enter fullscreen mode
function enterFullscreen() {
    let element = document.documentElement;  // The entire page

    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

// Function to handle fullscreen change
function onFullscreenChange() {
    if (!document.fullscreenElement) {
        // Show a message to re-enter fullscreen
        document.body.innerHTML = `
            <div style="text-align: center; margin-top: 20%;">
                <h1>You have exited fullscreen mode.</h1>
                <p>Please re-enter fullscreen mode to continue the exam.</p>
                <button onclick="reenterFullscreen()">Re-enter Fullscreen</button>
            </div>
        `;
    }
}

// Function to re-enter fullscreen
function reenterFullscreen() {
    enterFullscreen();
    // Optionally, restore the original content if needed
    setTimeout(() => {
        location.reload(); // Reload the page to restore the exam content
    }, 100); // Small delay to ensure fullscreen request is processed
}

// Function to disable specific keys
function checkKeys(event) {
    function cancel() {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }

    if (event.key === 'F11' || event.key === 'Escape') {
        alert(`The ${event.key} key is disabled on this page.`);
        return cancel();
    }
    if (event.altKey && event.key === 'Tab') { // Disable Alt+Tab
        return cancel();
    }
    if (event.key === 'Meta') { // Disable Windows key
        return cancel();
    }
}

// Add event listener for keydown
document.addEventListener('keydown', checkKeys);

// Add event listener for fullscreen change events
document.addEventListener('fullscreenchange', onFullscreenChange);

// Add event listener to the start exam button
document.getElementById('start-exam-btn').addEventListener('click', function() {
    enterFullscreen();
    startTimer();
    monitorExam();
});

// Function to monitor the exam
function monitorExam() {
    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState !== 'visible') {
            console.log('Tab switching detected');
            logEvent('Tab switch detected', 'User switched tabs during the exam.');
        }
    });

    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('copy', event => {
        event.preventDefault();
        alert('Copy function is disabled during the exam.');
    });
}

// Function to log events to the server
function logEvent(eventType, description) {
    fetch('/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventType, description })
    })
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error logging event:', error));
}

// Function to handle exam submission
function submitExam() {
    console.log("Submitting exam...");
    clearInterval(timerInterval);
    localStorage.removeItem('timeLeft'); // Clear the saved time when the exam is submitted

    const answers = [];
    const questionElements = document.querySelectorAll('.question');

    questionElements.forEach(questionElement => {
        const questionId = questionElement.getAttribute('data-id');
        let answer = '';

        const selectedRadio = questionElement.querySelector('input[type="radio"]:checked');
        if (selectedRadio) {
            answer = selectedRadio.value;
        } else {
            const textInput = questionElement.querySelector('input[type="text"]');
            if (textInput) {
                answer = textInput.value.trim();
            }
        }

        if (questionId) {
            answers.push({ question_id: parseInt(questionId), answer: answer });
        }
    });

    console.log("Answers collected:", answers);

    fetch('/submit-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: answers })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Server response:", data);
        alert(`Your answers have been submitted. Score: ${data.score}/${data.total}`);
        document.querySelector('button[onclick="submitExam()"]').disabled = true;
    })
    .catch(error => {
        console.error('Error submitting answers:', error);
        alert(`There was an error submitting your answers: ${error.message}. Please try again.`);
    });
}

// Add event listener for DOM fully loaded
document.addEventListener('DOMContentLoaded', function() {
    fetch('/questions')
        .then(response => response.json())
        .then(questions => {
            const questionContainer = document.getElementById('question-container');
            questions.forEach((question, index) => {
                const questionElement = document.createElement('div');
                questionElement.classList.add('question');
                questionElement.setAttribute('data-id', question.id);

                const prompt = document.createElement('p');
                prompt.textContent = `Question ${index + 1}: ${question.prompt}`;
                questionElement.appendChild(prompt);

                if (question.options) {
                    const options = question.options.split(',');
                    options.forEach(option => {
                        const label = document.createElement('label');
                        label.textContent = option;

                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = `question-${question.id}`;
                        radio.value = option;
                        radio.setAttribute('data-id', question.id);

                        label.prepend(radio);
                        questionElement.appendChild(label);
                    });
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = 'Your answer here';
                    input.setAttribute('data-id', question.id);
                    questionElement.appendChild(input);
                }

                questionContainer.appendChild(questionElement);
            });
        })
        .catch(error => console.error('Error fetching questions:', error));
});

// Add event listener to the submit answer button
document.getElementById('submit-answer-btn').addEventListener('click', function() {
    submitExam();
});
