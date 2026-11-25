import nodemailer from 'nodemailer'

type VerificationOTP = {
  email: string
  otp: string
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'
}

export async function sendVerificationOTP({ email, otp, type }: VerificationOTP) {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !from) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST and SMTP_FROM.')
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid port number.')
  }
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Set both SMTP_USER and SMTP_PASS, or leave both empty.')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    ...(user && pass ? { auth: { user, pass } } : {}),
  })
  const purpose = {
    'email-verification': 'verify your email',
    'sign-in': 'complete your sign-in',
    'forget-password': 'reset your password',
    'change-email': 'confirm your email change',
  }[type]

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Your TiffinTrack verification code',
    text: `Your code to ${purpose} is ${otp}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
  })
}
