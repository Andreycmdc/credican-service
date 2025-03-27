const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function (req, res, next) {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ success: false, message: "Acceso denegado" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ success: false, message: "Token inv�lido" });
    }
};
