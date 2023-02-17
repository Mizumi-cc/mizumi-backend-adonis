import { DateTime } from "luxon";
import { BaseModel, column } from "@ioc:Adonis/Lucid/Orm";

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public transactionId: string;

  @column()
  public fiatTransactionId: string;

  @column()
  public paymentProvider: string;

  @column()
  public fiatAmount: string;

  @column()
  public tokenAmount: string;

  @column()
  public token: string;

  @column()
  public fiat: string;

  @column()
  public status: string;

  @column()
  public kind: string;

  @column()
  public errorReason: string;

  @column()
  public country: string;

  @column()
  public rate: string;

  @column.dateTime({ autoCreate: true })
  public settledDate: DateTime;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
