export default function handler(req, res) {
  return res.status(410).json({
    success: false,
    disabled: true,
    error: 'LinkedIn data import is disabled. Please paste your profile sections or upload a profile PDF/TXT export.'
  })
}
