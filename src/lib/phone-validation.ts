/**
 * Phone number validation utilities for WhatsApp Business API
 * WhatsApp requires E.164 format: +[country code][number]
 * Example: +6591234567 (Singapore)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  error?: string;
}

/**
 * Validates and formats a phone number for WhatsApp
 * @param phoneNumber - The phone number to validate
 * @param defaultCountryCode - Default country code to use if none provided (default: '65' for Singapore)
 * @returns Validation result with formatted number if valid
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountryCode: string = '65'
): PhoneValidationResult {
  if (!phoneNumber) {
    return {
      isValid: false,
      error: 'Phone number is required',
    };
  }

  // Remove all whitespace and common separators
  let cleaned = phoneNumber.replace(/[\s\-()]/g, '');

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');

  // If it starts with +, it's already in international format
  if (cleaned.startsWith('+')) {
    // Validate format: + followed by 1-3 digit country code and 4-15 digit number
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (e164Regex.test(cleaned)) {
      return {
        isValid: true,
        formatted: cleaned,
      };
    } else {
      return {
        isValid: false,
        error: 'Invalid international phone number format. Use +[country code][number]',
      };
    }
  }

  // If no country code, add default
  const formatted = `+${defaultCountryCode}${cleaned}`;

  // Validate the final format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (e164Regex.test(formatted)) {
    return {
      isValid: true,
      formatted,
    };
  }

  return {
    isValid: false,
    error: `Invalid phone number. Expected format: +${defaultCountryCode}XXXXXXXX`,
  };
}

/**
 * Formats a phone number for display
 * @param phoneNumber - The phone number to format (should be in E.164 format)
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // Singapore format: +65 XXXX XXXX
  if (phoneNumber.startsWith('+65')) {
    const number = phoneNumber.slice(3);
    if (number.length === 8) {
      return `+65 ${number.slice(0, 4)} ${number.slice(4)}`;
    }
  }

  // Generic format: +XX XXX XXX XXXX
  const countryCode = phoneNumber.match(/^\+\d{1,3}/)?.[0] || '';
  const rest = phoneNumber.slice(countryCode.length);

  if (rest.length >= 6) {
    const parts = rest.match(/.{1,4}/g) || [];
    return `${countryCode} ${parts.join(' ')}`;
  }

  return phoneNumber;
}

/**
 * Validates if a phone number is in valid E.164 format
 * @param phoneNumber - The phone number to check
 * @returns True if the number is in valid E.164 format
 */
export function isE164Format(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Extracts country code from E.164 formatted phone number
 * @param phoneNumber - The phone number in E.164 format
 * @returns Country code or null if invalid
 */
export function extractCountryCode(phoneNumber: string): string | null {
  if (!phoneNumber.startsWith('+')) {
    return null;
  }

  // Common country codes are 1-3 digits
  const match = phoneNumber.match(/^\+(\d{1,3})/);
  return match ? match[1] : null;
}
