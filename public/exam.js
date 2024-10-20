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

// Violation tracking
let violationCount = 0;
const maxViolations = 4; // Set the maximum number of violations allowed
let examBlocked = false;
let examStarted = false; // Flag to indicate if the exam has started

// Function to start the timer
function startTimer() {
    examStarted = true; // Set examStarted to true when the timer starts
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

// Function to enter full-screen mode
function enterFullscreen() {
    if (!examBlocked) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.log(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

// Function to handle full-screen changes or key presses
function onFullscreenChangeOrKeyPress(event) {
    if (examBlocked) return; // If the exam is blocked, do nothing

    // Check for ESC or F11 key presses
    if (event.code === "Escape" || event.code === "F11") {
        violationCount++;
        console.log("Violation count:", violationCount);
        document.documentElement.requestFullscreen();

        if (!document.fullscreenElement) {
            violationCount++;
            alert(`Warning! You have pressed ${event.code} (${violationCount}/${maxViolations}). Stay in full-screen mode.`);
        }

        if (violationCount >= maxViolations) {
            blockExam(); // Block the exam if violations exceed the limit
        } else {
            alert(`Warning! You have pressed ${event.code} (${violationCount}/${maxViolations}). Stay in full-screen mode.`);
            enterFullscreen(); // Attempt to re-enter full-screen mode
        }
    }

}

// Function to block the exam and send userId to the server
function blockExam() {
    examBlocked = true; // Set the examBlocked flag to true
    document.body.innerHTML = `
        <div style="text-align: center; margin-top: 20%; font-size: 24px;">
            <h1>You have been blocked from the exam.</h1>
            <p>You exceeded the allowed number of attempts to exit full-screen mode or switched tabs.</p>
        </div>
    `;
    
    // Send the blocked user's userId to the server
    if (currentUserId) {
        fetch('/block-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUserId })
        })
        .then(response => response.json())
        .then(data => {
            console.log("User blocked, server response:", data);
        })
        .catch(error => {
            console.error('Error sending blocked user data:', error);
        });
    } else {
        console.error('Error: No user ID found to send.');
    }
}

// Add event listeners
//document.addEventListener('fullscreenchange', onFullscreenChangeOrKeyPress);
document.addEventListener('keydown', onFullscreenChangeOrKeyPress);

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
        // Redirect to the score page
        window.location.href = `score.html?score=${data.score}&total=${data.total}`;
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

// Add event listener to the start exam button
document.getElementById('start-exam-btn').addEventListener('click', function() {
    enterFullscreen();
    startTimer();
    monitorExam();

});

// Function to monitor the exam
function monitorExam() {
    // Add event listener to detect tab switching or loss of focus
    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState !== 'visible') {
            alert('Tab switching is not allowed during the exam!');
            violationCount++; // Increment the violation count
            logEvent('Tab switch detected', 'User switched tabs during the exam.');
            
            if (violationCount >= maxViolations) {
                blockExam(); // Block the exam if violations exceed the limit
            }
        }
    });

    // Disable right-click context menu
    document.addEventListener('contextmenu', event => {
        event.preventDefault(); // Prevent the default context menu from appearing
        alert('Right-click is disabled during the exam.'); // Optional: Show an alert
    });

    document.addEventListener('copy', event => {
        event.preventDefault();
        alert('Copy function is disabled during the exam.');
    });
}

// Call monitorExam to start monitoring
monitorExam();

// Handle fullscreen change events
document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
        alert("You have exited full-screen mode. Please re-enter full-screen.");
        violationCount++; // Increment violation count on exit
        console.log("Violation count after exiting fullscreen:", violationCount);
        if (violationCount >= maxViolations) {
            console.log("Blocking user due to violation count:", violationCount);
            blockExam(); // Block the exam if violations exceed the limit
        }
    }
});

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

// Example of calling blockExam with a user ID
let currentUserId; // Declare a variable to hold the user ID

function login(username, password) {
    // Simulate an API call to authenticate the user
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUserId = data.userId; // Set the user ID from the response
            console.log(`User logged in: ${currentUserId}`);
        } else {
            alert('Login failed: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error during login:', error);
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
        // Redirect to the score page
        window.location.href = `score.html?score=${data.score}&total=${data.total}`;
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

// Function to enter full-screen mode
function enterFullscreen() {
    let element = document.documentElement; // The entire page

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

document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
        alert("You have exited full-screen mode. Please re-enter full-screen.");
        violationCount++; // Increment violation count on exit
        console.log("Violation count after exiting fullscreen:", violationCount);
        if (violationCount >= maxViolations) {
            console.log("Blocking user due to violation count:", violationCount);
            blockExam(); // Block the exam if violations exceed the limit
        }
    }
});



