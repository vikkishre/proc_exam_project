// server.js
// Importing required modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');

// Creating an instance of express
const app = express();
// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(cors());

// Serve static files from a directory (e.g., 'public')
app.use(express.static('public'));

// Creating a connection to the MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'challa123', // Replace with your MySQL password
    database: 'exam_db' // The name of the database you created
});

// Connecting to the MySQL database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Endpoint to submit answers and check correctness
app.post('/submit-answer', (req, res) => {
    const userAnswers = req.body.answers; // Expecting an array of answers

    // Prepare SQL query to fetch correct answers for the submitted questions
    const questionIds = userAnswers.map(answer => answer.question_id);
    const query = 'SELECT id, correct_answer FROM questions WHERE id IN (?)';

    db.query(query, [questionIds], (err, results) => {
        if (err) {
            console.error('Error fetching correct answers:', err);
            return res.status(500).send('Error fetching correct answers');
        }

        // Map of question IDs to correct answers
        const correctAnswers = results.reduce((map, item) => {
            map[item.id] = item.correct_answer;
            return map;
        }, {});

        // Compare user answers with correct answers
        const score = userAnswers.reduce((score, answer) => {
            if (answer.answer === correctAnswers[answer.question_id]) {
                return score + 1; // Increment score for each correct answer
            }
            return score;
        }, 0);

        // Respond with the user's score
        res.status(200).send({ score: score, total: userAnswers.length });
    });
});

// Endpoint to fetch questions
app.get('/questions', (req, res) => {
    const query = 'SELECT * FROM questions';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).send('Error fetching questions');
        }
        res.status(200).json(results);
    });
});

// Setting the port for the server
const PORT = 3000;
// Starting the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
