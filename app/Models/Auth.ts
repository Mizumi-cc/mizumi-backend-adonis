import { DateTime } from 'luxon'
import { v4 as uuid } from 'uuid'
import Hash from '@ioc:Adonis/Core/Hash'
import { column, beforeSave, BaseModel, beforeCreate } from '@ioc:Adonis/Lucid/Orm'
import Encryption from '@ioc:Adonis/Core/Encryption'

export default class Auth extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @beforeCreate()
  public static assignUuid(auth: Auth) {
    auth.id = uuid()
  }

  @column()
  public username: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column()
  public rememberMeToken: string | null

  @column()
  public walletAddress: string | null

  @column({
    serializeAs: null,
    consume: (value: string) => (value ? JSON.parse(Encryption.decrypt(value) ?? '{}') : null),
    prepare: (value: string) => Encryption.encrypt(JSON.stringify(value)),
  })
  public twoFactorSecret?: string

  @column({
    serializeAs: null,
    consume: (value: string) => (value ? JSON.parse(Encryption.decrypt(value) ?? '[]') : []),
    prepare: (value: string[]) => Encryption.encrypt(JSON.stringify(value)),
  })
  public twoFactorRecoveryCodes?: string[]

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeSave()
  public static async hashPassword (auth: Auth) {
    if (auth.$dirty.password) {
      auth.password = await Hash.make(auth.password)
    }
  }

  public get isTwoFactorEnabled() {
    if (Object.keys(this.twoFactorSecret!).length === 0) return false
    return Boolean(this?.twoFactorSecret)
  }
}
