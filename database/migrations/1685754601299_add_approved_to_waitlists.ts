import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Waitlists extends BaseSchema {
  protected tableName = 'waitlists'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.boolean('approved').defaultTo(false)
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('approved')
    })
  }
}
