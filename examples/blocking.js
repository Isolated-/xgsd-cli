const blockingAction = async (input) => {
  console.log('blockingAction called', input)

  while (true) {}

  return {data: input}
}
module.exports = blockingAction
