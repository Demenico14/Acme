/**
 * Generates a secure random password
 * @param length The length of the password (default: 8)
 * @returns A secure random password
 */
export const generateSecurePassword = (length = 8): string => {
    // Define character sets
    const uppercaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ" // Excluding confusing chars like I and O
    const lowercaseChars = "abcdefghijkmnopqrstuvwxyz" // Excluding confusing chars like l
    const numberChars = "23456789" // Excluding confusing chars like 0 and 1
    const specialChars = "!@#$%^&*_-+="
  
    // Ensure minimum length
    const actualLength = Math.max(length, 8)
  
    // Ensure at least one character from each set
    let password = ""
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length))
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length))
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length))
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))
  
    // Fill the rest of the password
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars
    for (let i = password.length; i < actualLength; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length))
    }
  
    // Shuffle the password to avoid predictable patterns
    return shuffleString(password)
  }
  
  /**
   * Shuffles a string randomly
   * @param str The string to shuffle
   * @returns The shuffled string
   */
  const shuffleString = (str: string): string => {
    const array = str.split("")
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array.join("")
  }
  
  /**
   * Checks if a password meets the minimum requirements
   * @param password The password to check
   * @returns True if the password meets the requirements, false otherwise
   */
  export const isPasswordSecure = (password: string): boolean => {
    const minLength = Number(process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH) || 8
  
    // Check minimum length
    if (password.length < minLength) return false
  
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false
  
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) return false
  
    // Check for at least one number
    if (!/[0-9]/.test(password)) return false
  
    // Check for at least one special character
    if (!/[!@#$%^&*()_\-+=[\]{};:'",<.>/?\\|]/.test(password)) return false
  
    return true
  }
  