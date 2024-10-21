// Importing necessary modules
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

// Creating an instance of Express
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
    // Extracting questions from the request body
    const questions = req.body.questions;

    // Check if questions are provided; if not, return a 400 error
    if (!questions || !questions.length) {
        return res.status(400).json({ message: 'No questions provided.' });
    }

    // Prepare an array of promises for inserting each question into the database
    const insertQueries = questions.map(({ prompt, options, correct_answer }) => {
        return new Promise((resolve, reject) => {
            // SQL query to insert a question into the 'questions' table
            const query = 'INSERT INTO questions (prompt, options, correct_answer) VALUES (?, ?, ?)';
            // Execute the query with the provided parameters
            db.query(query, [prompt, JSON.stringify(options), correct_answer], (err, result) => {
                // If there's an error, reject the promise
                if (err) {
                    return reject(err);
                }
                // Resolve the promise with the result if successful
                resolve(result);
            });
        });
    });

    // Handling the promises for all insert queries
    Promise.all(insertQueries)
        .then(() => {
            // If all inserts are successful, send a success response
            res.json({ message: 'Test questions successfully submitted!' });
        })
        .catch((err) => {
            // Log the error and send a 500 error response if any insert fails
            console.error('Error saving test:', err);
            res.status(500).json({ message: 'Error saving test questions.' });
        });
});

// Endpoint to display saved tests
app.get('/display_tests', (req, res) => {
    // SQL query to select prompt, options, and correct_answer from the 'questions' table
    const query = 'SELECT prompt, options, correct_answer FROM questions';
    // Execute the query to fetch saved tests
    db.query(query, (err, results) => {
        // If there's an error fetching tests, log it and send a 500 error response
        if (err) {
            console.error('Error fetching tests:', err);
            return res.status(500).json({ message: 'Error fetching tests.' });
        }

        // Safely parse options, or handle plain text as a fallback
        const formattedResults = results.map(test => {
            let parsedOptions;
            try {
                // Attempt to parse options as JSON
                parsedOptions = JSON.parse(test.options);
            } catch (error) {
                // Fallback: split options by comma if not valid JSON
                parsedOptions = test.options.split(',');
            }

            // Return the test object with parsed options
            return {
                ...test,
                options: parsedOptions
            };
        });

        // Send the formatted results as a 200 response
        res.status(200).json(formattedResults);
    });
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
