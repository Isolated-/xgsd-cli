const failingAction = async (input) => {
  console.log('failingAction called', input)
  throw new Error('This action always fails')
}
module.exports = failingAction
