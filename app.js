const express = require('express');
var bodyParser = require('body-parser');
const app = express();
const port = 9000
const nodemailer = require("nodemailer");
const path = require('path');
require("dotenv").config();
const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");


const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webpush.setVapidDetails(
  "mailto:example@yourdomain.com",
  publicVapidKey,
  privateVapidKey
);

// Setup Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(
  express.urlencoded({
    extended: true,
  })
)

app.use(express.json());

// passing the vapid key to frontend route
app.get("/vapidPublicKey", (req, res) => {
  res.json({ key: process.env.PUBLIC_VAPID_KEY });
});

app.get("/proxy", async (req, res) => {
  const url = req.query.url; // e.g. /proxy?url=https://example.com
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Simple passthrough (no rewriting of assets yet)
    res.send(text);
  } catch (err) {
    res.status(500).send("Error loading external site");
  }
});



(app.use(express.static(path.join(__dirname, '/src')))),


  app.get('/', (request, response) => {
    response.sendFile(__dirname + '/src')
  });


app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/manifest.json'));
});

// app.js
app.post("/subscribe", async (req, res) => {
  const { subscription, title, message, url } = req.body;
  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: title,
      body: message,
      url: url, // Top level
      data: { url: url } // Nested level
    }));
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Push failed" });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`this project is working fine at http://localhost:${port}`);
});
