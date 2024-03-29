import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class CreditUserValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    userId: schema.string(),
    txId: schema.string(),
    mobileNetwork: schema.string.optional(),
    mobileNumber: schema.string.optional(),
    bankCode: schema.string.optional(),
    bankAccount: schema.string.optional(),
  })

  public messages: CustomMessages = {}
}