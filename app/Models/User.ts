import { DateTime } from "luxon";
import Transaction from "App/Models/Transaction"
import { BaseModel, column, hasMany, HasMany } from "@ioc:Adonis/Lucid/Orm";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @column()
  public walletAddress: string;

  @column()
  public kycFields?: {};

  @column()
  public paymentDetails?: {};

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @hasMany(() => Transaction)
  public transactions: HasMany<typeof Transaction>
}
