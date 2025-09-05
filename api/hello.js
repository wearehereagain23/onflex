export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // use * for now
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    res.status(200).json({ message: "Hello World from Vercel!" });
}
