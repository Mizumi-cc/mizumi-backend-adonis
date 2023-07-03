import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class TwoFactorChallengeValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    code: schema.string.optional(),
    recoveryCode: schema.string.optional(),
    id: schema.string(),
  })

  public messages: CustomMessages = {}
}
