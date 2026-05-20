/** Маска ввода времени 24ч (ЧЧ:ММ), как в TimeIntervalDialog. */
export function formatReportTimeInput(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length === 0) return '';

  if (numbers.length === 1) {
    const firstDigit = parseInt(numbers[0], 10);
    if (firstDigit > 2) {
      return `0${numbers[0]}:`;
    }
    return numbers;
  }

  if (numbers.length === 2) {
    const hours = parseInt(numbers, 10);
    if (hours > 23) {
      return '23:';
    }
    return `${numbers}:`;
  }

  if (numbers.length === 3) {
    const hours = parseInt(numbers.slice(0, 2), 10);
    const minuteDigit = parseInt(numbers[2], 10);
    const h = hours > 23 ? '23' : numbers.slice(0, 2);
    if (minuteDigit > 5) {
      return `${h}:5`;
    }
    return `${h}:${numbers[2]}`;
  }

  const hours = parseInt(numbers.slice(0, 2), 10);
  const minutes = parseInt(numbers.slice(2, 4), 10);
  const h = hours > 23 ? '23' : numbers.slice(0, 2).padStart(2, '0');
  const m = minutes > 59 ? '59' : numbers.slice(2, 4).padStart(2, '0');
  return `${h}:${m}`;
}

export function isCompleteReportTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
