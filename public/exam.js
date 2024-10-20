// exam.js
// Initialize timeLeft to 3600 seconds, equivalent to 60 minutes
let timeLeft = 3600; 
// Declare a variable to hold the timer interval
let timerInterval; 
// Declare a variable to hold the fullscreen change listener
let fullscreenChangeListener; 
let currentQuestionIndex = 0;
const questions = [
    "Question 1: What is the capital of France?",
    "Question 2: What is the largest planet in our solar system?",
    // Add more questions as needed
];

// Function to start the timer
function startTimer() {
    // Retrieve the timer element from the DOM
    const timerElement = document.getElementById('time');
    // Set the timer interval to update every second
    timerInterval = setInterval(() => { 
        // Check if time is up
        if (timeLeft <= 0) {
            // Clear the interval when time is up
            clearInterval(timerInterval); 
            // Alert the user that time is up and submit the exam
            alert('Time is up! Submitting your exam.');
            // Call the function to submit the exam
            submitExam();
        } else {
            // Calculate minutes and seconds from timeLeft
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            // Format the time and update the timer element
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            // Decrement timeLeft by 1 second
            timeLeft--;
        }
    }, 1000);
}

// Add event listener to the start exam button
document.getElementById('start-exam-btn').addEventListener('click', function() {
    // Request fullscreen on button click
    if (document.documentElement.requestFullscreen) {
        // Attempt to enter fullscreen mode
        document.documentElement.requestFullscreen().then(() => {
            // Start the timer and monitoring after entering fullscreen
            startTimer();
            monitorExam();
        }).catch(err => {
            // Alert the user if there's an error enabling fullscreen mode
            alert(`Error trying to enable fullscreen mode: ${err.message}`);
        });
    } else {
        // Alert the user if the browser does not support the Fullscreen API
        alert('Fullscreen API is not supported in this browser.');
    }
});

// Function to monitor the exam
function monitorExam() {
    // Define the function to handle fullscreen change events
    fullscreenChangeListener = () => {
        // Check if the user has exited fullscreen mode
        if (!document.fullscreenElement) {
            // Alert the user to stay in fullscreen mode
            alert('Please stay in fullscreen mode during the exam.');
            // Attempt to re-enter fullscreen mode
            document.documentElement.requestFullscreen();
        }
    };

    // Add event listener for fullscreen change events
    document.addEventListener('fullscreenchange', fullscreenChangeListener);

    // Add event listener for visibility change events to detect tab switching
    document.addEventListener("visibilitychange", function() {
        // Check if the document is not visible, indicating a tab switch
        if (document.visibilityState !== 'visible') {
            console.log('Tab switching detected');
            // Log the event to the server
            logEvent('Tab switch detected', 'User switched tabs during the exam.');
        }
    });

    // Disable right-click and copy functions during the exam
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('copy', event => {
        event.preventDefault();
        alert('Copy function is disabled during the exam.');
    });
}

// Function to log events to the server
function logEvent(eventType, description) {
    // Construct the fetch request to log the event
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

    const answers = [];
    const questionElements = document.querySelectorAll('.question');

    questionElements.forEach(questionElement => {
        const questionId = questionElement.getAttribute('data-id');
        let answer = '';

        // Check for radio buttons (multiple choice)
        const selectedRadio = questionElement.querySelector('input[type="radio"]:checked');
        if (selectedRadio) {
            answer = selectedRadio.value;
        } else {
            // Check for text input
            const textInput = questionElement.querySelector('input[type="text"]');
            if (textInput) {
                answer = textInput.value.trim();
            }
        }

        // Push the answer even if it's empty
        answers.push({ question_id: parseInt(questionId), answer: answer });
    });

    console.log("Answers collected:", answers);

    fetch('/submit-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: answers })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);
        alert(`Your answers have been submitted. Score: ${data.score}/${data.total}`);
        document.querySelector('button[onclick="submitExam()"]').disabled = true;
    })
    .catch(error => {
        console.error('Error submitting answers:', error);
        alert("There was an error submitting your answers. Please try again.");
    });
}

// Add event listener for DOM fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fetch questions from the server
    fetch('/questions')
        .then(response => response.json())
        .then(questions => {
            // Retrieve the question container from the DOM
            const questionContainer = document.getElementById('question-container');
            // Loop through each question and create a question element
            questions.forEach((question, index) => {
                const questionElement = document.createElement('div');
                questionElement.classList.add('question');

                // Create a paragraph element for the question prompt
                const prompt = document.createElement('p');
                // Add question number using the index + 1 (since index is 0-based)
                prompt.textContent = `Question ${index + 1}: ${question.prompt}`;
                questionElement.appendChild(prompt);

                if (question.options) {
                    const options = question.options.split(','); // Split the options by comma
                    options.forEach(option => {
                        const label = document.createElement('label');
                        label.textContent = option;

                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = `question-${question.id}`; // Group by question ID
                        radio.value = option;
                        radio.setAttribute('data-id', question.id); // Store question ID

                        label.prepend(radio);
                        questionElement.appendChild(label);
                    });
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = 'Your answer here';
                    input.setAttribute('data-id', question.id); // Store question ID
                    questionElement.appendChild(input);
                }

                questionContainer.appendChild(questionElement);
            });
        })
        .catch(error => console.error('Error fetching questions:', error));
});

// Add event listener to the submit answer button
document.getElementById('submit-answer-btn').addEventListener('click', function() {
    // Initialize an array to hold the answers
    const answers = [];
    // Retrieve all input elements for answers
    const inputs = document.querySelectorAll('input[type="text"]');

    // Loop through each input element
    inputs.forEach(input => {
        // Retrieve the question ID and answer from the input element
        const questionId = input.getAttribute('data-id');
        const answer = input.value;

        // Check if an answer is provided
        if (answer) {
            // Add the question ID and answer to the answers array
            answers.push({ question_id: questionId, answer: answer });
        }
    });

    // Send all answers to the server
    fetch('/submit-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(answers)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        alert("Your answers have been submitted.");
    })
    .catch(error => {
        console.error('Error submitting answers:', error);
        alert("There was an error submitting your answers.");
    });
});

// Remove or comment out the nextQuestion function and any related event listeners
// function nextQuestion() {
//     currentQuestionIndex++;
//     if (currentQuestionIndex < questions.length) {
//         document.getElementById('question').innerText = questions[currentQuestionIndex];
//     } else {
//         alert("No more questions available.");
//     }
// }


