import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class NewTransactionValidator {
  constructor(protected ctx: HttpContextContract) {}

  /*
   * Define schema to validate the "shape", "type", "formatting" and "integrity" of data.
   *
   * For example:
   * 1. The username must be of data type string. But then also, it should
   *    not contain special characters or numbers.
   *    ```
   *     schema.string({}, [ rules.alpha() ])
   *    ```
   *
   * 2. The email must be of data type string, formatted as a valid
   *    email. But also, not used by any other user.
   *    ```
   *     schema.string({}, [
   *       rules.email(),
   *       rules.unique({ table: 'users', column: 'email' }),
   *     ])
   *    ```
   */
  public schema = schema.create({
    userId: schema.string(),
    fiatAmount: schema.number(),
    tokenAmount: schema.number(),
    token: schema.number(),
    fiat: schema.number(),
    kind: schema.number(),
    country: schema.string(),
    fiatRate: schema.number(),
    tokenRate: schema.number(),
    payoutInfo: schema.object().members({
      method: schema.string(),
      walletAddress: schema.string.optional(),
      accountNumber: schema.string.optional(),
      accountName: schema.string.optional(),
      momoNumber: schema.string.optional(),
      momoName: schema.string.optional(),
      momoNetwork: schema.string.optional(),
    })
  })

  /**
   * Custom messages for validation failures. You can make use of dot notation `(.)`
   * for targeting nested fields and array expressions `(*)` for targeting all
   * children of an array. For example:
   *
   * {
   *   'profile.username.required': 'Username is required',
   *   'scores.*.number': 'Define scores as valid numbers'
   * }
   *
   */
  public messages: CustomMessages = {}
}
