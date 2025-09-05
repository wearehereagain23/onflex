export default function handler(req, res) {
    // Always set CORS headers first
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // 🔒 Replace * with your Firebase domain later
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        // Preflight request → return only headers
        return res.status(200).end();
    }

    // Your actual response
    res.status(200).json({ message: "Hello World from Vercel!" });
}
