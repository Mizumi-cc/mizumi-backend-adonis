import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class DebitUserValidator {
constructor(protected ctx: HttpContextContract) {}

public schema = schema.create({
  userId: schema.string(),
  txId: schema.string(),
  blockchainTxId: schema.string(),
})

public messages: CustomMessages = {}
}
