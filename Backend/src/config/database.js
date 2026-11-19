const mongoose = require("mongoose")



async function connectToDB() {

    try {
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connected to Database")

        /* Create the MongoDB schema (collections + indexes) if they don't
           exist yet. Mongoose models define the schema; this ensures the
           users, InterviewReport and blacklistTokens collections and their
           unique indexes are present in Atlas on every deploy. */
        try {
            const userModel = require("../models/user.model")
            const interviewReportModel = require("../models/interviewReport.model")
            const tokenBlacklistModel = require("../models/blacklist.model")

            for (const model of [userModel, interviewReportModel, tokenBlacklistModel]) {
                await model.createCollection()
                await model.ensureIndexes()
            }
            console.log("Database schemas ensured: users, InterviewReport, blacklistTokens")
        } catch (schemaErr) {
            console.log("Schema ensure failed:", schemaErr.message)
        }
    }
    catch (err) {
        console.log(err)
    }
}

module.exports = connectToDB
