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
    console.log("Received request body:", req.body);
    const userAnswers = req.body.answers;
    console.log("Received answers:", userAnswers);

    if (!userAnswers || userAnswers.length === 0) {
        console.error('No answers provided');
        return res.status(400).json({ error: 'No answers provided' });
    }

    // Get all question IDs from the submitted answers
    const questionIds = userAnswers.map(answer => answer.question_id);

    // First, delete all existing answers for these questions
    const deleteQuery = 'DELETE FROM answers WHERE question_id IN (?)';
    db.query(deleteQuery, [questionIds], (deleteErr, deleteResult) => {
        if (deleteErr) {
            console.error('Error deleting old answers:', deleteErr);
            return res.status(500).json({ error: 'Error deleting old answers' });
        }

        console.log("Old answers deleted. Affected rows:", deleteResult.affectedRows);

        // Now insert the new answers
        const insertQuery = 'INSERT INTO answers (question_id, answer) VALUES ?';
        const values = userAnswers.map(answer => [answer.question_id, answer.answer]);

        db.query(insertQuery, [values], (insertErr, insertResult) => {
            if (insertErr) {
                console.error('Error inserting new answers:', insertErr);
                return res.status(500).json({ error: 'Error saving new answers' });
            }

            console.log("New answers inserted. Affected rows:", insertResult.affectedRows);

            // Fetch correct answers and calculate score
            const scoreQuery = 'SELECT id, correct_answer FROM questions WHERE id IN (?)';
            db.query(scoreQuery, [questionIds], (scoreErr, scoreResults) => {
                if (scoreErr) {
                    console.error('Error fetching correct answers:', scoreErr);
                    return res.status(500).json({ error: 'Error calculating score' });
                }

                const correctAnswers = scoreResults.reduce((map, item) => {
                    map[item.id] = item.correct_answer;
                    return map;
                }, {});

                const score = userAnswers.reduce((score, answer) => {
                    if (answer.answer === correctAnswers[answer.question_id]) {
                        return score + 1;
                    }
                    return score;
                }, 0);

                res.status(200).json({ score: score, total: userAnswers.length });
            });
        });
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
