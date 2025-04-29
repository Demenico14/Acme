import emailjs from "@emailjs/browser"

interface EmailParams {
  to_email: string
  to_name: string
  password: string
  role: string
  login_url: string
}

export const sendWelcomeEmail = async (params: EmailParams): Promise<boolean> => {
  try {
    // Get EmailJS credentials from environment variables
    const userId = process.env.NEXT_PUBLIC_EMAILJS_USER_ID
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID

    // Check if EmailJS is configured
    if (!userId || !serviceId || !templateId) {
      console.error("EmailJS configuration is missing. Please check your .env file.")
      return false
    }

    // Set default login URL if not provided
    const loginUrl = params.login_url || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Send email using EmailJS
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        ...params,
        login_url: loginUrl,
      },
      userId,
    )

    if (response.status === 200) {
      console.log("Welcome email sent successfully")
      return true
    } else {
      console.error("Failed to send welcome email:", response)
      return false
    }
  } catch (error) {
    console.error("Error sending welcome email:", error)
    return false
  }
}

export const isEmailConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_EMAILJS_USER_ID &&
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
  )
}
