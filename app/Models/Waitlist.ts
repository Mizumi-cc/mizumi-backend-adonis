import { DateTime } from 'luxon'
import { v4 as uuid } from "uuid";
import { BaseModel, column,beforeCreate } from '@ioc:Adonis/Lucid/Orm'

export default class Waitlist extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @beforeCreate()
  public static assignUuid(waitlist: Waitlist) {
    waitlist.id = uuid()
  }

  @column()
  public email: string

  @column()
  public approved: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
