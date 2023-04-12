import { DateTime } from "luxon";
import User from "App/Models/User";
import { BaseModel, column, hasOne, HasOne } from "@ioc:Adonis/Lucid/Orm";

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @column()
  public userId: string;

  @column()
  public blockchainTransactionId: string;

  @column()
  public fiatTransactionId: string;

  @column()
  public paymentProvider: string;

  @column()
  public fiatAmount: number;

  @column()
  public tokenAmount: number;

  @column()
  public token: number;

  @column()
  public fiat: number;

  @column()
  public status: number;

  @column()
  public kind: number;

  @column()
  public errorReason: string;

  @column()
  public country: string;

  @column()
  public rate: number;

  @column.dateTime({ autoCreate: true })
  public settledDate: DateTime;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @hasOne(() => User, ({
    foreignKey: 'id'
  }))
  public user: HasOne<typeof User>
}
