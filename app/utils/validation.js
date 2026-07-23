export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
    if (!email) return 'Kolom ini harus diisi!'
    if (!emailRegex.test(email)) return 'Format email tidak valid.'
    return null
}