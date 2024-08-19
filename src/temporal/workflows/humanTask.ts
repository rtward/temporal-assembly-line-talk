export async function humanTask(input: number[]) {
  return input.reduce((acc, curr) => acc + curr, 0);
}
