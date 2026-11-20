import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, extractJdFromUrl } from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile, onUploadProgress }) => {
        setLoading(true)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile, onUploadProgress })
            setReport(response.interviewReport)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response.interviewReport
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
        return response.interviewReport
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response.interviewReports
    }

    const [ resumeLoading, setResumeLoading ] = useState(false)
    const [ resumeError, setResumeError ] = useState("")

    const getResumePdf = async (interviewReportId) => {
        setResumeLoading(true)
        setResumeError("")
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
        }
        catch (error) {
            console.log(error)
            setResumeError("Resume download failed. Please wait a few seconds and try again.")
        } finally {
            setResumeLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    const [ jdLoading, setJdLoading ] = useState(false)

    const getJdFromUrl = async (url) => {
        setJdLoading(true)
        try {
            const data = await extractJdFromUrl(url)
            return data.jobDescription
        } finally {
            setJdLoading(false)
        }
    }

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf, resumeLoading, resumeError, jdLoading, getJdFromUrl }

}