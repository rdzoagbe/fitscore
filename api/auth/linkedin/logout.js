export default function handler(req, res) {
  return res.status(410).json({
    success: false,
    disabled: true,
    error: 'LinkedIn login is disabled. Joblytics uses paste-only profile optimization for privacy and reliability.'
  })
}
