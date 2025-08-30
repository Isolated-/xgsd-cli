const upperCaseFn = async (context) => {
  console.log('upperCaseFn called', context)

  if (context.data && !context.data.hash) {
    return {data: context.data.toUpperCase()}
  }

  return {data: context.data.hash.toUpperCase()}
}

module.exports = upperCaseFn
