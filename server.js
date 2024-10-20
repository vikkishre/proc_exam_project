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

// Endpoint to submit answers
app.post('/submit-answer', (req, res) => {
    // Extracting question_id and answer from the request body
    const { question_id, answer } = req.body;

    // SQL query to insert the answer into the database
    const query = 'INSERT INTO answers (question_id, answer) VALUES (?, ?)';
    // Executing the query with the provided question_id and answer
    db.query(query, [question_id, answer], (err, results) => {
        if (err) {
            console.error('Error inserting answer:', err);
            return res.status(500).send('Error saving answer');
        }
        // Sending a success response with the insertId
        res.status(200).send({ message: 'Answer saved successfully', id: results.insertId });
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
