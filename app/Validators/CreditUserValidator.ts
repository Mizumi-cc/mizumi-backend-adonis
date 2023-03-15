import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class CreditUserValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    userId: schema.number(),
    txId: schema.number(),
    amount: schema.number(),
    mobileNetwork: schema.string.optional(),
    mobileNumber: schema.string.optional(),
    bankCode: schema.string.optional(),
    bankAccount: schema.string.optional(),
  })

  public messages: CustomMessages = {}
}