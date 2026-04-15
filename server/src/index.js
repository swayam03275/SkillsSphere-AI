const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

app.use('/auth', authRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
