require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./utils/db');

const app = express();

// Connect Database
try {
  db.connect(function (err) {
    if (err) {
      throw err;
    }
    console.log("DB Connected!");
  });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// Avoid cors error
app.use(cors({
  origin: '*'
}));

// Init Middleware
app.use(express.json());

// Define Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/campaign', require('./routes/campaignRoute'));
app.use('/api/post', require('./routes/postRoute'));
app.use('/api/other', require('./routes/otherRoute'));

if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// app.use(express.static('client/build'));

// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
// });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
