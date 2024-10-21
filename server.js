// Importing required modules
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

// Creating an instance of express
const app = express();
// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(cors());
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Creating a connection to the MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'challa123',
    database: 'exam_db'
});

// Connecting to the MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

// --------------------------------------------------------------------------------------
// Test Management Functions (Kept As-Is)
// --------------------------------------------------------------------------------------

// Endpoint to submit test questions
app.post('/submit_test', (req, res) => {
    const questions = req.body.questions;

    if (!questions || !questions.length) {
        return res.status(400).json({ message: 'No questions provided.' });
    }

    const insertQueries = questions.map(({ prompt, options, correct_answer }) => {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO questions (prompt, options, correct_answer) VALUES (?, ?, ?)';
            db.query(query, [prompt, JSON.stringify(options), correct_answer], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    });

    Promise.all(insertQueries)
        .then(() => res.json({ message: 'Test questions successfully submitted!' }))
        .catch((err) => {
            console.error('Error saving test:', err);
            res.status(500).json({ message: 'Error saving test questions.' });
        });
});

// Endpoint to display saved tests
app.get('/display_tests', (req, res) => {
    const query = 'SELECT prompt, options, correct_answer FROM questions';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching tests:', err);
            return res.status(500).json({ message: 'Error fetching tests.' });
        }

        const formattedResults = results.map(test => {
            let parsedOptions;
            try {
                parsedOptions = JSON.parse(test.options);
            } catch (error) {
                parsedOptions = test.options.split(',');
            }

            return { ...test, options: parsedOptions };
        });

        res.status(200).json(formattedResults);
    });
});

// Endpoint to handle joining a test by checking the 5-digit code
app.post('/join_test', (req, res) => {
    const { code } = req.body;

    if (!/^\d{5}$/.test(code)) {
        return res.status(400).json({ success: false, message: 'Invalid code format.' });
    }

    const query = 'SELECT * FROM test_codes WHERE code = ?';
    db.query(query, [code], (err, results) => {
        if (err) {
            console.error('Error checking code:', err);
            return res.status(500).json({ success: false, message: 'Server error checking code.' });
        }

        res.json({ success: true, message: 'Code accepted! Redirecting to the test...' });
    });
});

// --------------------------------------------------------------------------------------
// User Management Functions (Kept As-Is)
// --------------------------------------------------------------------------------------

// Endpoint to submit answers and check correctness
app.post('/submit-answer', (req, res) => {
    const userAnswers = req.body.answers;
    if (!userAnswers || userAnswers.length === 0) {
        return res.status(400).json({ error: 'No answers provided' });
    }

    const questionIds = userAnswers.map(answer => answer.question_id);
    const deleteQuery = 'DELETE FROM answers WHERE question_id IN (?)';
    db.query(deleteQuery, [questionIds], (deleteErr) => {
        if (deleteErr) return res.status(500).json({ error: 'Error deleting old answers' });

        const insertQuery = 'INSERT INTO answers (question_id, answer) VALUES ?';
        const values = userAnswers.map(answer => [answer.question_id, answer.answer]);
        db.query(insertQuery, [values], (insertErr) => {
            if (insertErr) return res.status(500).json({ error: 'Error saving new answers' });

            const scoreQuery = 'SELECT id, correct_answer FROM questions WHERE id IN (?)';
            db.query(scoreQuery, [questionIds], (scoreErr, scoreResults) => {
                if (scoreErr) return res.status(500).json({ error: 'Error calculating score' });

                const correctAnswers = scoreResults.reduce((map, item) => {
                    map[item.id] = item.correct_answer;
                    return map;
                }, {});

                const score = userAnswers.reduce((totalScore, answer) => {
                    return totalScore + (answer.answer === correctAnswers[answer.question_id] ? 1 : 0);
                }, 0);

                res.status(200).json({ score, total: userAnswers.length });
            });
        });
    });
});

// Endpoint to report user violations
app.post('/report-violation', (req, res) => {
    const { userId, reason, violationCount, timestamp } = req.body;

    const query = 'INSERT INTO blocked_users (user_id, reason, violation_count, blocked_at) VALUES (?, ?, ?, ?)';
    db.query(query, [userId, reason, violationCount, timestamp], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error reporting violation' });
        res.status(200).json({ message: 'Violation reported successfully' });
    });
});

// Endpoint to block a user
app.post('/block-user', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const query = 'INSERT INTO blocked_users (user_id, blocked_at) VALUES (?, NOW())';
    db.query(query, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error blocking user' });
        res.status(200).json({ message: 'User blocked successfully' });
    });
});

// --------------------------------------------------------------------------------------
// Additional Routes for Question Fetching
// --------------------------------------------------------------------------------------

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

// --------------------------------------------------------------------------------------
// Starting the server
// --------------------------------------------------------------------------------------

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
