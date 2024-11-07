const express = require('express');
const axios = require('axios');
const app = express();
// Lubame CORS-i kõikide päritolude jaoks
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Või asenda * oma veebilehe päritoluga
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get('/proxy', async (req, res) => {
    const start = req.query.start;
    const end = req.query.end;
    try {
        const response = await axios.get(`https://dashboard.elering.ee/api/nps/price?start=${start}&end=${end}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error');
    }
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));
