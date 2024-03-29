import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";
import User from "App/Models/User";
import { BaseModel, column, hasOne, HasOne, beforeCreate } from "@ioc:Adonis/Lucid/Orm";

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @beforeCreate()
  public static assignUuid(transaction: Transaction) {
    transaction.id = uuid()
  }

  @column()
  public userId: string;

  @column()
  public transactionHash: string;

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
  public fiatRate: number;

  @column()
  public tokenRate: number;

  @column()
  public payoutInfo: any;

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
