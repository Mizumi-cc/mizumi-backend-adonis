import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class DebitUserValidator {
constructor(protected ctx: HttpContextContract) {}

public schema = schema.create({
  userId: schema.string(),
  txId: schema.number(),
  cardFirstName: schema.string.optional(),
  cardLastName: schema.string.optional(),
  cardNumber: schema.string.optional(),
  cardExpiry: schema.string.optional(),
  cardCvc: schema.string.optional(),
  cardCountry: schema.string.optional(),
  cardAddress: schema.string.optional(),
  cardCity: schema.string.optional(),
  cardState: schema.string.optional(),
  cardZip: schema.string.optional(),
  cardEmail: schema.string.optional(),
})

public messages: CustomMessages = {}
}
