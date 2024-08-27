/**
 * This function takes a string, extracts all the numbers, and turns them into an array of
 * individual digits.
 *
 * @param input The string to turn into task input
 * @returns The string, split into individual digits
 */
export async function getDigitsFromString(input: string): Promise<number[]> {
  console.log(`doActivity: got some input to handl: ${input}`);

  const numbers = [...input.matchAll(/\d+/g)].join("");
  const digits = numbers.split("").map((digit) => parseInt(digit, 10));
  return digits;
}
