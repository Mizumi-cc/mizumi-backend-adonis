/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import { validator } from '@ioc:Adonis/Core/Validator'
import { PublicKey } from '@solana/web3.js'

validator.rule('isPublicKey', (value, _, options) => {
  if (typeof value !== 'string') {
    return 
  }

  try {
    new PublicKey(value)
  } catch (error) {
    options.errorReporter.report(
      options.pointer,
      'isPublicKey',
      'Invalid public key',
      options.arrayExpressionPointer
    )
  }
})
