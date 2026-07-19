const maskPhone = (phone) => {
  if (!phone) return phone;
  const str = String(phone);
  if (str.length <= 3) return "***";
  return `${"*".repeat(str.length - 3)}${str.slice(-3)}`;
};

module.exports = { maskPhone };
