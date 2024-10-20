const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors()); // To allow cross-origin requests
app.use(bodyParser.json()); // To parse incoming JSON data

// MySQL connection configuration
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'challa123',
    database: 'exam_db'
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

// Endpoint to handle test submission
app.post('/submit_test', (req, res) => {
    const questions = req.body.questions;

    if (!questions || !questions.length) {
        return res.status(400).json({ message: 'No questions provided.' });
    }

    const insertQueries = questions.map(({ prompt, options, correct_answer }) => {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO questions (prompt, options, correct_answer) VALUES (?, ?, ?)';
            db.query(query, [prompt, JSON.stringify(options), correct_answer], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    });

    Promise.all(insertQueries)
        .then(() => {
            res.json({ message: 'Test questions successfully submitted!' });
        })
        .catch((err) => {
            console.error('Error saving test:', err);
            res.status(500).json({ message: 'Error saving test questions.' });
        });
});


// Endpoint to display saved tests
// Endpoint to display saved tests
// Endpoint to display saved tests
app.get('/display_tests', (req, res) => {
    const query = 'SELECT prompt, options, correct_answer FROM questions';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching tests:', err);
            return res.status(500).json({ message: 'Error fetching tests.' });
        }

        // Safely parse options, or handle plain text as a fallback
        const formattedResults = results.map(test => {
            let parsedOptions;
            try {
                parsedOptions = JSON.parse(test.options); // Try parsing as JSON
            } catch (error) {
                parsedOptions = test.options.split(','); // Fallback: split by comma if not valid JSON
            }

            return {
                ...test,
                options: parsedOptions
            };
        });

        res.status(200).json(formattedResults);
    });
});


// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
