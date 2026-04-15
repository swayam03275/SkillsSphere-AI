const express = require('express');

const router = express.Router();

// TODO: Implement JWT authentication
// TODO: Add session handling
router.post('/login', (req, res) => {
  res.json({ message: 'Login route (TODO)' });
});

// TODO: Implement JWT authentication
// TODO: Add session handling
router.post('/register', (req, res) => {
  res.json({ message: 'Register route (TODO)' });
});

module.exports = router;
