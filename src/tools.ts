export const tryCall = <T>(thunk: () => T) => {
  try {
    const result = thunk()
    return [result, null] as const
  } catch (err) {
    if (err instanceof Error) {
      return [null, err] as const
    } else {
      throw err
    }
  }
}
