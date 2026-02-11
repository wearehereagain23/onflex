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
  // We now expect 'uuid' from the frontend instead of the full subscription object
  const { uuid, title, message, url } = req.body;

  try {
    // 1. Fetch ALL device subscriptions for this user from Supabase
    const { data: devices, error } = await supabase
      .from('notification_subscribers')
      .select('subscribers')
      .eq('uuid', uuid);

    if (error) throw error;

    if (!devices || devices.length === 0) {
      return res.status(404).json({ error: "No registered devices found for this user." });
    }

    console.log(`User ${uuid} has ${devices.length} devices. Sending notifications...`);

    // 2. Create the payload
    const payload = JSON.stringify({
      title: title,
      body: message,
      url: url,
      data: { url: url }
    });

    // 3. Loop through all devices and send the push
    // We use Promise.allSettled so that if one device fails (e.g., phone is off), 
    // it doesn't stop the others from receiving the alert.
    const sendPromises = devices.map(device => {
      // 'device.subscribers' is the JSON object we stored via the PWA
      return webpush.sendNotification(device.subscribers, payload)
        .catch(async (err) => {
          // If the status is 410 (Gone) or 404 (Not Found), the token is expired.
          // Optional: You can delete the stale token from Supabase here.
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log("Stale token detected. Cleanup recommended.");
          }
        });
    });

    await Promise.allSettled(sendPromises);

    res.status(201).json({ success: true, devicesReached: devices.length });

  } catch (err) {
    console.error("Multi-device push failed:", err);
    res.status(500).json({ error: "Push process failed" });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`this project is working fine at http://localhost:${port}`);
});
