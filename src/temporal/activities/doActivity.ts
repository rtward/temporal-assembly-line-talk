export async function doActivity(input: string): Promise<number[]> {
  console.log(`doActivity: got some input to handl: ${input}`);

  const numbers = [...input.matchAll(/\d+/g)].join("");
  const digits = numbers.split("").map((digit) => parseInt(digit, 10));
  return digits;
}
