function validateRequiredString(value, fieldName, maxLength = 100) {
  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return `${fieldName} is required`;
  }

  if (trimmedValue.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }

  return null;
}

module.exports = {
  validateRequiredString,
};
