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


const ff = path.join(__dirname, '/src')
app.use(express.static(ff));


app.get('/', (request, response) => {
    response.sendFile(__dirname + '/src')
});


app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/sw.js'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/manifest.json'));
});

// 📩 Route: Subscribe + Send Notification
// Subscribe route: send notification
// Subscribe route: send notification
app.post("/subscribe", async (req, res) => {
    const { subscription, uuid, title, message } = req.body;

    try {
        await webpush.sendNotification(subscription, JSON.stringify({
            title,
            body: message
        }));

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("❌ Push failed:", err.statusCode, err.body);

        // If subscription is invalid (410 Gone or 404 Not Found), delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
            console.log("⚠️ Removing invalid subscription...");

            await supabase
                .from("OnlinBankinsubscribers")
                .delete()
                .eq("uuid", uuid)
                .eq("subscribers->>endpoint", subscription.endpoint);
            // 👆 remove by endpoint inside JSON
        }

        res.status(500).json({ error: "Push failed" });
    }
});



//REGISTRATION WELCOME MESSAGE

app.post('/register', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email,
        subject: "Welcome Message From OnTransat",
        html:
            `

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Welcome Message</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #eef2f5;
            font-family: Arial, sans-serif;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
        }

        .header {
            background: #072d00;
            color: #fff;
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 100px;
            display: block;
            margin: 0 auto;
        }

        .greeting {
            font-size: 22px;
            margin: 20px;
        }

        .message {
            margin: 0 20px 20px;
            font-size: 16px;
            line-height: 1.5;
        }

        .features {
            width: 100%;
            border-collapse: collapse;
        }

        .feature-cell {
            width: 50%;
            padding: 10px 20px;
            vertical-align: top;
        }

        .icon {
            width: 40px;
            vertical-align: middle;
            margin-right: 10px;
        }

        .feature-title {
            font-size: 16px;
            font-weight: bold;
        }

        .interactive {
            margin: 20px;
            padding: 15px;
            background: #f0f8ff;
            border-radius: 5px;
        }

        .footer {
            background: #f4f6f8;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }

        .social-icons img {
            width: 24px;
            margin: 0 5px;
        }

        @media (max-width:480px) {
            .feature-cell {
                display: block;
                width: 100%;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG">
            <h3 style="color: greenyellow;">OnTransat</h3>
            <p>Your trusted partner in modern banking</p>
        </div>

        <div class="greeting">Hello, ${info.name}!</div>
        <div class="message">
            We’re delighted you're now part of the <strong>OnTransat</strong> family. Welcome aboard! Here, banking
            meets simplicity, security, and your financial goals become our priority.
        </div>

        <table class="features">
            <tr>
                <td class="feature-cell">
                    <svg class="w-[44px] h-[44px] text-gray-800 dark:text-white" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9.5 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h4.5M7 11V7a3 3 0 0 1 6 0v1.5m2.5 5.5v1.5l1 1m3.5-1a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                    </svg>

                    <span class="feature-title">24/7 Secure Access</span><br>
                    Bank safely anytime, anywhere.
                </td>
                <td class="feature-cell">
                    <svg class="w-[44px] h-[44px] text-gray-800 dark:text-white" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                        viewBox="0 0 24 24">
                        <path fill-rule="evenodd"
                            d="M20.337 3.664c.213.212.354.486.404.782.294 1.711.657 5.195-.906 6.76-1.77 1.768-8.485 5.517-10.611 6.683a.987.987 0 0 1-1.176-.173l-.882-.88-.877-.884a.988.988 0 0 1-.173-1.177c1.165-2.126 4.913-8.841 6.682-10.611 1.562-1.563 5.046-1.198 6.757-.904.296.05.57.191.782.404ZM5.407 7.576l4-.341-2.69 4.48-2.857-.334a.996.996 0 0 1-.565-1.694l2.112-2.111Zm11.357 7.02-.34 4-2.111 2.113a.996.996 0 0 1-1.69-.565l-.422-2.807 4.563-2.74Zm.84-6.21a1.99 1.99 0 1 1-3.98 0 1.99 1.99 0 0 1 3.98 0Z"
                            clip-rule="evenodd" />
                    </svg>

                    <span class="feature-title">Instant Transfers</span><br>
                    Send money with speed and confidence.
                </td>
            </tr>
            <tr>
                <td class="feature-cell">
                    <svg class="w-[44px] h-[44px] text-gray-800 dark:text-white" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                        viewBox="0 0 24 24">
                        <path d="M17 20v-5h2v6.988H3V15h1.98v5H17Z" />
                        <path
                            d="m6.84 14.522 8.73 1.825.369-1.755-8.73-1.825-.369 1.755Zm1.155-4.323 8.083 3.764.739-1.617-8.083-3.787-.739 1.64Zm3.372-5.481L10.235 6.08l6.859 5.704 1.132-1.362-6.859-5.704ZM15.57 17H6.655v2h8.915v-2ZM12.861 3.111l6.193 6.415 1.414-1.415-6.43-6.177-1.177 1.177Z" />
                    </svg>

                    <span class="feature-title">Smart Insights</span><br>
                    Track spending and set financial goals.
                </td>
                <td class="feature-cell">
                    <svg class="w-[44px] h-[44px] text-gray-800 dark:text-white" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                        viewBox="0 0 24 24">
                        <path fill-rule="evenodd"
                            d="M11 4a1 1 0 0 0-1 1v10h10.459l.522-3H16a1 1 0 1 1 0-2h5.33l.174-1H16a1 1 0 1 1 0-2h5.852l.117-.67v-.003A1.983 1.983 0 0 0 20.06 4H11ZM9 18c0-.35.06-.687.17-1h11.66c.11.313.17.65.17 1v1a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-1Zm-6.991-7a17.8 17.8 0 0 0 .953 6.1c.198.54 1.61.9 2.237.9h1.34c.17 0 .339-.032.495-.095a1.24 1.24 0 0 0 .41-.27c.114-.114.2-.25.254-.396a1.01 1.01 0 0 0 .055-.456l-.242-2.185a1.073 1.073 0 0 0-.395-.71 1.292 1.292 0 0 0-.819-.286H5.291c-.12-.863-.17-1.732-.145-2.602-.024-.87.024-1.74.145-2.602H6.54c.302 0 .594-.102.818-.286a1.07 1.07 0 0 0 .396-.71l.24-2.185a1.01 1.01 0 0 0-.054-.456 1.088 1.088 0 0 0-.254-.397 1.223 1.223 0 0 0-.41-.269A1.328 1.328 0 0 0 6.78 4H4.307c-.3-.001-.592.082-.838.238a1.335 1.335 0 0 0-.531.634A17.127 17.127 0 0 0 2.008 11Z"
                            clip-rule="evenodd" />
                    </svg>

                    <span class="feature-title">Dedicated Support</span><br>
                    We're here whenever you need us.
                </td>
            </tr>
        </table>

        <div class="interactive">
            Want to explore your finances further? Reply with your goal—whether it's saving, planning, or investing—and
            our team will guide you personally.
        </div>

        <div class="message">
            We'll be sending tips, features, and updates to help you thrive. Meanwhile, feel free to reply to this email
            anytime or visit our <a href="https://on-flex.web.app">Support Center</a>.
        </div>

        <div class="footer">
            © 2025 OnTransat. All rights reserved.<br>

            <a href="">Unsubscribe</a>
        </div>
    </div>
</body>

</html>

`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});





//VISITOR DETECTOR  MESSAGE

app.post('/visitorEmail.html', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: 'tijeoma05@gmail.com',
        subject: "New Visitor",
        html:
            `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            color: #333;
        }

        .email-container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        h2 {
            color: #2a9d8f;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th,
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }

        th {
            background-color: #f0f0f0;
        }

        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <h2>🚨 New Visitor Detected</h2>
        <p>${info.subjectMessage}</p>

        <table>
            <tr>
                <th>Field</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Country</td>
                <td>${info.country}</td>
            </tr>
           <tr>
                <td>City</td>
                <td>${info.city}</td>
            </tr>
           <tr>
                <td>Country Code</td>
                <td>${info.countryCode}</td>
            </tr>
             <tr>
                <td>Origin</td>
                <td>${info.org}</td>
            </tr>
            <tr>
                <td>Region Name</td>
                <td>${info.regionName}</td>
            </tr>
            <tr>
                <td>App-Name</td>
                <td>${info.appName}</td>
            </tr>
            <tr>
                <td>App-Version</td>
                <td>${info.appVersion}</td>
            </tr>
            <tr>
                <td>Platform</td>
                <td>${info.platform}</td>
            </tr>
            <tr>
                <td>Language</td>
                <td>${info.language}</td>
            </tr>
         
            <tr>
                <td>Latitude & Longitude</td>
                <td>${info.lat},${info.lon}</td>
            </tr>
           <tr>
                <td>Time-zone</td>
                <td>${info.timezone}</td>
            </tr>
        </table>

        <div class="footer">
            Visitor alert generated by your website’s tracking system.
        </div>
    </div>
</body>

</html>`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});



//VISITOR DETECTOR  MESSAGE 2

app.post('/visitorEmail2.html', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: 'tijeoma05@gmail.com',
        subject: "Old Visitor",
        html:
            `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            color: #333;
        }

        .email-container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        h2 {
            color: #2a9d8f;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th,
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }

        th {
            background-color: #f0f0f0;
        }

        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <h2>🚨 Old Visitor Detected</h2>
        <p>${info.subjectMessage}</p>

        <table>
            <tr>
                <th>Field</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Country</td>
                <td>${info.country}</td>
            </tr>
           <tr>
                <td>City</td>
                <td>${info.city}</td>
            </tr>
           <tr>
                <td>Country Code</td>
                <td>${info.countryCode}</td>
            </tr>
             <tr>
                <td>Origin</td>
                <td>${info.org}</td>
            </tr>
            <tr>
                <td>Region Name</td>
                <td>${info.regionName}</td>
            </tr>
            <tr>
                <td>App-Name</td>
                <td>${info.appName}</td>
            </tr>
            <tr>
                <td>App-Version</td>
                <td>${info.appVersion}</td>
            </tr>
            <tr>
                <td>Platform</td>
                <td>${info.platform}</td>
            </tr>
            <tr>
                <td>Language</td>
                <td>${info.language}</td>
            </tr>
      
            <tr>
                <td>Latitude & Longitude</td>
                <td>${info.lat},${info.lon}</td>
            </tr>
           <tr>
                <td>Time-zone</td>
                <td>${info.timezone}</td>
            </tr>
        </table>

        <div class="footer">
            Visitor alert generated by your website’s tracking system.
        </div>
    </div>
</body>

</html>`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});


//VISITOR DETECTOR  MESSAGE 3

app.post('/visitorEmail3.html', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: 'tijeoma05@gmail.com',
        subject: "Suspicious Visitor",
        html:
            `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            color: #333;
        }

        .email-container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        h2 {
            color: #2a9d8f;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th,
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }

        th {
            background-color: #f0f0f0;
        }

        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <h2>🚨 Suspicious Visitor Detected</h2>
        <p>${info.subjectMessage}</p>

        <table>
            <tr>
                <th>Field</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Country</td>
                <td>${info.country}</td>
            </tr>
           <tr>
                <td>City</td>
                <td>${info.city}</td>
            </tr>
           <tr>
                <td>Country Code</td>
                <td>${info.countryCode}</td>
            </tr>
             <tr>
                <td>Origin</td>
                <td>${info.org}</td>
            </tr>
            <tr>
                <td>Region Name</td>
                <td>${info.regionName}</td>
            </tr>
            <tr>
                <td>App-Name</td>
                <td>${info.appName}</td>
            </tr>
            <tr>
                <td>App-Version</td>
                <td>${info.appVersion}</td>
            </tr>
            <tr>
                <td>Platform</td>
                <td>${info.platform}</td>
            </tr>
            <tr>
                <td>Language</td>
                <td>${info.language}</td>
            </tr>
        
            <tr>
                <td>Latitude & Longitude</td>
                <td>${info.lat},${info.lon}</td>
            </tr>
           <tr>
                <td>Time-zone</td>
                <td>${info.timezone}</td>
            </tr>
        </table>

        <div class="footer">
            Visitor alert generated by your website’s tracking system.
        </div>
    </div>
</body>

</html>`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});



//LOGIN OTP MESSAGE

app.post('/login', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email,
        subject: "New Message From OnTransat",
        html: `
        
        <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Two-Factor Authentication</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #eef2f5;
            font-family: Arial, sans-serif;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .header {
            background: #072d00;
            color: #fff;
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 100px;
            display: block;
            margin: 0 auto;
        }

        .otp-box {
            text-align: center;
            padding: 20px;
            background: #f0fff0;
            border-radius: 8px;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #072d00;
            margin: 20px;
            border: 2px dashed #6cc070;
        }

        .greeting {
            font-size: 20px;
            margin: 20px;
        }

        .message {
            margin: 0 20px 20px;
            font-size: 16px;
            line-height: 1.5;
        }

        .security-note {
            margin: 20px;
            padding: 15px;
            background: #fffbe5;
            border-radius: 5px;
            font-size: 14px;
            color: #7a5d00;
            border: 1px solid #f3e2a9;
        }

        .footer {
            background: #f4f6f8;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }

        a {
            color: #072d00;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG">
            <h3 style="color: greenyellow;">OnTransat</h3>
            <p>Two-Factor Authentication Code</p>
        </div>

        <div class="greeting">Hello, ${info.name}!</div>

        <div class="message">
            We received a request to log in to your <strong>OnTransat</strong> account.
            To continue, please enter the One-Time Password (OTP) below.
        </div>

        <div class="otp-box">
            ${info.otp}
        </div>

        <div class="security-note">
            ⚠️ This OTP will expire in <strong>5 minutes</strong>.
            Do not share this code with anyone. Our team will never ask for your OTP.
        </div>

        <div class="message">
            If you did not request this login, please <a href="https://on-flex.web.app/contact/index.html">contact
                support</a>
            immediately.
        </div>

        <div class="footer">
            © 2025 OnTransat. All rights reserved.<br>
            <a href="#">Unsubscribe</a>
        </div>
    </div>
</body>

</html>
        `
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});


//FORGOTTEN PASSWORD OTP MESSAGE

app.post('/password', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email,
        subject: "New Message From OnTransat",
        html: `
        
        <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Two-Factor Authentication</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #eef2f5;
            font-family: Arial, sans-serif;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .header {
            background: #072d00;
            color: #fff;
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 100px;
            display: block;
            margin: 0 auto;
        }

        .otp-box {
            text-align: center;
            padding: 20px;
            background: #f0fff0;
            border-radius: 8px;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #072d00;
            margin: 20px;
            border: 2px dashed #6cc070;
        }

        .greeting {
            font-size: 20px;
            margin: 20px;
        }

        .message {
            margin: 0 20px 20px;
            font-size: 16px;
            line-height: 1.5;
        }

        .security-note {
            margin: 20px;
            padding: 15px;
            background: #fffbe5;
            border-radius: 5px;
            font-size: 14px;
            color: #7a5d00;
            border: 1px solid #f3e2a9;
        }

        .footer {
            background: #f4f6f8;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }

        a {
            color: #072d00;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG">
            <h3 style="color: greenyellow;">OnTransat</h3>
            <p>Two-Factor Authentication Code</p>
        </div>

        <div class="greeting">Hello, ${info.name}!</div>

        <div class="message">
            We received change password request to your <strong>OnTransat</strong> account.
            To continue, please enter the One-Time Password (OTP) below.
        </div>

        <div class="otp-box">
            ${info.otp}
        </div>

        <div class="security-note">
            ⚠️ This OTP will expire in <strong>5 minutes</strong>.
            Do not share this code with anyone. Our team will never ask for your OTP.
        </div>

        <div class="message">
            If you did not request this login, please <a href="https://on-flex.web.app/contact/index.html">contact
                support</a>
            immediately.
        </div>

        <div class="footer">
            © 2025 OnTransat. All rights reserved.<br>
            <a href="#">Unsubscribe</a>
        </div>
    </div>
</body>

</html>
        `
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});


//LOCAL TRANSFER

app.post('/local.html', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email,
        subject: "New Message From OnTransat",
        html:
            `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Money Transfer Alert - OnTransat</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #0d1117;
            font-family: Arial, sans-serif;
            color: #e6edf3;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #161b22;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 170, 0.2);
        }

        .header {
            background: linear-gradient(90deg, #0f5132, #198754);
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 90px;
            display: block;
            margin: 0 auto;
        }

        .header h3 {
            color: #00ffae;
            margin: 10px 0 5px;
        }

        .alert-title {
            font-size: 20px;
            text-align: center;
            color: #79c0ff;
            margin: 20px;
        }

        .details {
            padding: 0 20px 20px;
        }

        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
        }

        .detail-table th,
        .detail-table td {
            padding: 10px;
            text-align: left;
        }

        .detail-table th {
            background-color: rgba(0, 255, 170, 0.08);
            color: #00ffae;
            font-weight: bold;
            width: 35%;
        }

        .detail-table td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .status {
            font-weight: bold;
            color: #00ffae;
        }

        .footer {
            background: #0d1117;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #8b949e;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        a {
            color: #00ffae;
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG"
                alt="OnFlexLogo">
            <h3>OnTransat</h3>
            <p>Your futuristic financial gateway</p>
        </div>

        <!-- Alert Title -->
        <div class="alert-title">
            🚀 Transaction Alert — Funds Transferred Successfully
        </div>

        <!-- Transaction Details -->
        <div class="details">
            <table class="detail-table">
                <tr>
                    <th>Amount</th>
                    <td style="color: white;">${info.amount}</td>
                </tr>
                <tr>
                    <th>Date</th>
                    <td style="color: white;">${info.date}</td>
                </tr>
                <tr>
                    <th>Name</th>
                    <td style="color: white;">${info.name2}</td>
                </tr>
                <tr>
                    <th>Description</th>
                    <td style="color: white;">${info.description}</td>
                </tr>
                <tr>
                    <th>Status</th>
                    <td class="status" style="color: white;">✅ ${info.status}</td>
                </tr>
                <tr>
                    <th>Bank Name</th>
                    <td style="color: white;">OnTransat</td>
                </tr>
                <tr>
                    <th>Transaction Ref</th>
                    <td style="color: white;">${info.ref}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            This is an automated notification from <strong>OnTransat</strong>.
            If you did not authorize this transaction, please <a
                href="https://on-flex.web.app/contact/index.html">contact support immediately</a>.
            <br><br>© 2025 OnTransat. All rights reserved.
        </div>
    </div>
</body>

</html>`
    };


    const mail_option2 = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email2,
        subject: "New Message From OnTransat",
        html:
            `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Money Transfer Alert - OnTransat</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #0d1117;
            font-family: Arial, sans-serif;
            color: #e6edf3;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #161b22;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 170, 0.2);
        }

        .header {
            background: linear-gradient(90deg, #0f5132, #198754);
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 90px;
            display: block;
            margin: 0 auto;
        }

        .header h3 {
            color: #00ffae;
            margin: 10px 0 5px;
        }

        .alert-title {
            font-size: 20px;
            text-align: center;
            color: #79c0ff;
            margin: 20px;
        }

        .details {
            padding: 0 20px 20px;
        }

        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
        }

        .detail-table th,
        .detail-table td {
            padding: 10px;
            text-align: left;
        }

        .detail-table th {
            background-color: rgba(0, 255, 170, 0.08);
            color: #00ffae;
            font-weight: bold;
            width: 35%;
        }

        .detail-table td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .status {
            font-weight: bold;
            color: #00ffae;
        }

        .footer {
            background: #0d1117;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #8b949e;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        a {
            color: #00ffae;
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG"
                alt="OnFlexLogo">
            <h3>OnTransat</h3>
            <p>Your futuristic financial gateway</p>
        </div>

        <!-- Alert Title -->
        <div class="alert-title">
            🚀 Transaction Alert — Funds Received Successfully
        </div>

        <!-- Transaction Details -->
        <div class="details">
            <table class="detail-table">
                <tr>
                    <th>Amount</th>
                    <td style="color: white;">${info.amount}</td>
                </tr>
                <tr>
                    <th>Date</th>
                    <td style="color: white;">${info.date}</td>
                </tr>
                <tr>
                    <th>Name</th>
                    <td style="color: white;">${info.name}</td>
                </tr>
                <tr>
                    <th>Description</th>
                    <td style="color: white;">${info.description}</td>
                </tr>
                <tr>
                    <th>Status</th>
                    <td class="status" style="color: white;">✅ ${info.status}</td>
                </tr>
                <tr>
                    <th>Bank Name</th>
                    <td style="color: white;">OnTransat</td>
                </tr>
                <tr>
                    <th>Transaction Ref</th>
                    <td style="color: white;">${info.ref}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            This is an automated notification from <strong>OnTransat</strong>.
            If you did not authorize this transaction, please <a
                href="https://on-flex.web.app/contact/index.html">contact support immediately</a>.
            <br><br>© 2025 OnTransat. All rights reserved.
        </div>
    </div>
</body>

</html>`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);
        const info3 = await transporter.sendMail(mail_option2);

        console.log("Email sent: ", info2);
        console.log("Email sent: ", info3);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});


//international TRANSFER

app.post('/international.html', async (req, res) => {


    let info = req.body

    var transporter = nodemailer.createTransport({
        host: 'mail.assistin.online',
        secureConnection: true,
        port: 465,
        service: 'SMTP',
        auth: {
            user: "onflex@assistin.online",
            pass: "Foxxo00000T#=25?"
        },
        from: "onflex@assistin.online",
    });

    const mail_option = {
        from: `OnFlex<noreply@assistin.online>`,
        to: info.email,
        subject: "New Message From OnTransat",
        html:
            `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Money Transfer Alert - OnTransat</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #0d1117;
            font-family: Arial, sans-serif;
            color: #e6edf3;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #161b22;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 170, 0.2);
        }

        .header {
            background: linear-gradient(90deg, #0f5132, #198754);
            text-align: center;
            padding: 20px;
        }

        .header img {
            width: 90px;
            display: block;
            margin: 0 auto;
        }

        .header h3 {
            color: #00ffae;
            margin: 10px 0 5px;
        }

        .alert-title {
            font-size: 20px;
            text-align: center;
            color: #79c0ff;
            margin: 20px;
        }

        .details {
            padding: 0 20px 20px;
        }

        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
        }

        .detail-table th,
        .detail-table td {
            padding: 10px;
            text-align: left;
        }

        .detail-table th {
            background-color: rgba(0, 255, 170, 0.08);
            color: #00ffae;
            font-weight: bold;
            width: 35%;
        }

        .detail-table td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .status {
            font-weight: bold;
            color: #00ffae;
        }

        .footer {
            background: #0d1117;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #8b949e;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        a {
            color: #00ffae;
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG"
                alt="OnFlexLogo">
            <h3>OnTransat</h3>
            <p>Your futuristic financial gateway</p>
        </div>

        <!-- Alert Title -->
        <div class="alert-title">
            🚀 Transaction Alert — Funds Transferred Successfully
        </div>

        <!-- Transaction Details -->
        <div class="details">
            <table class="detail-table">
                <tr>
                    <th>Amount</th>
                    <td style="color: white;">${info.amount}</td>
                </tr>
                <tr>
                    <th>Date</th>
                    <td style="color: white;">${info.date}</td>
                </tr>
                <tr>
                    <th>Name</th>
                    <td style="color: white;">${info.name}</td>
                </tr>
                <tr>
                    <th>Description</th>
                    <td style="color: white;">${info.description}</td>
                </tr>
                <tr>
                    <th>Status</th>
                    <td class="status" style="color: white;">✅ ${info.status}</td>
                </tr>
                <tr>
                    <th>Bank Name</th>
                    <td style="color: white;">${info.bankName}</td>
                </tr>
                <tr>
                    <th>Transaction Ref</th>
                    <td style="color: white;">${info.ref}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            This is an automated notification from <strong>OnTransat</strong>.
            If you did not authorize this transaction, please <a
                href="https://on-flex.web.app/contact/index.html">contact support immediately</a>.
            <br><br>© 2025 OnTransat. All rights reserved.
        </div>
    </div>
</body>

</html>`
    };

    try {
        const info2 = await transporter.sendMail(mail_option);

        console.log("Email sent: ", info2);

        res.send("Email sent successfully!");


    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send email.");
    }

});


app.listen(port, '0.0.0.0', () => {
    console.log(`this project is working fine at http://localhost:${port}`);
});
