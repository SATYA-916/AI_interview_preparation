const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")



async function authUser(req, res, next) {

    // Accept the JWT from the Authorization header (used by the web app,
    // where cross-site cookies may be blocked by the browser) or the cookie.
    const authHeader = req.headers.authorization
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    const token = bearerToken || req.cookies.token

    if (!token) {
        return res.status(401).json({
            message: "Token not provided."
        })
    }

    const isTokenBlacklisted = await tokenBlacklistModel.findOne({
        token
    })

    if (isTokenBlacklisted) {
        return res.status(401).json({
            message: "token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token."
        })
    }

}


module.exports = { authUser }