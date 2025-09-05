export default function handler(req, res) {
    // Allow all origins (for dev). For production, replace * with your domain.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        // End preflight request.
        return res.status(200).end();
    }

    res.status(200).json({ message: "Hello World from Vercel!" });
}
