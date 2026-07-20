/**
 * Converts a number into English words following the Indian numbering system.
 */
export function convertNumberToWords(num: number): string {
  if (isNaN(num) || num <= 0) return "";
  
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertLessThanThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let result = "";
  let temp = Math.floor(num);

  // Crore (1,00,00,000)
  if (temp >= 10000000) {
    const crore = Math.floor(temp / 10000000);
    result += convertLessThanThousand(crore) + " Crore ";
    temp %= 10000000;
  }

  // Lakh (1,00,000)
  if (temp >= 100000) {
    const lakh = Math.floor(temp / 100000);
    result += convertLessThanThousand(lakh) + " Lakh ";
    temp %= 100000;
  }

  // Thousand (1,000)
  if (temp >= 1000) {
    const thousand = Math.floor(temp / 1000);
    result += convertLessThanThousand(thousand) + " Thousand ";
    temp %= 1000;
  }

  if (temp > 0) {
    result += convertLessThanThousand(temp);
  }

  result = result.trim();
  if (result === "") return "";

  if (Math.floor(num) === 1) {
    return "One Rupee Only";
  } else {
    return result + " Rupees Only";
  }
}
