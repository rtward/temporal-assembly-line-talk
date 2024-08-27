/**
 * This is a do-nothing function just to demonstrate how we can do things with human task output.
 *
 * @param input The input to the activity
 */
export async function doubleNumber(input: number) {
  console.log(
    `doAnotherActivity: handling the result from the human task ${input}`
  );
  return input * 2;
}
