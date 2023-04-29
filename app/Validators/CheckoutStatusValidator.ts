import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class CheckoutStatusValidator {
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
    event: schema.string(),
    data: schema.object().members({
      business: schema.string(),
      virtualAccount: schema.string(),
      sourceCurrency: schema.string(),
      destinationCurrency: schema.string(),
      sourceAmount: schema.number(),
      destinationAmount: schema.number(),
      amountReceived: schema.number(),
      fee: schema.number(),
      customerName: schema.string(),
      settlementDestination: schema.string(),
      status: schema.string(),
      initiatedAt: schema.string(),
      createdAt: schema.string(),
      updatedAt: schema.string(),
      reference: schema.string(),
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
