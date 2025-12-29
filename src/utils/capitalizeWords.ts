export const capitalizeWords = (text = '') =>
  text.replace(/\b\w/g, char => char.toUpperCase());
