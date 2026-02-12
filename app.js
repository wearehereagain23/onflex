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


// --- USER PWA ROUTES ---
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/sw.js'));
});
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/manifest.json'));
});

// --- ADMIN PWA ROUTES (Change the URL paths!) ---
app.get('/admin/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript'); // Force correct type
  res.sendFile(path.join(__dirname, 'src/admin/sw.js'));
});

app.get('/admin/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/admin/manifest.json'));
});


app.post("/subscribe", async (req, res) => {
  const { uuid, title, message, url } = req.body;

  // IMPORTANT: We must filter by 'uuid' to ensure only the 
  // receiver's devices get the alert, not everyone.
  try {
    const { data: devices, error } = await supabase
      .from('notification_subscribers')
      .select('subscribers')
      .eq('uuid', uuid); // <--- THIS FILTER IS VITAL

    if (!devices || devices.length === 0) {
      return res.status(200).json({ success: true, info: "No devices for this user." });
    }

    const payload = JSON.stringify({
      title: title,
      body: message,
      url: url,
      data: { url: url }
    });

    const sendPromises = devices.map(device => {
      return webpush.sendNotification(device.subscribers, payload)
        .catch(err => console.error("Push failed for one device", err.statusCode));
    });

    await Promise.allSettled(sendPromises);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Broadcasting error" });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`this project is working fine at http://localhost:${port}`);
});
