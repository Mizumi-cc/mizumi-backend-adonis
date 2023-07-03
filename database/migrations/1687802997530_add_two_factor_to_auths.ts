import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'auths'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.text("two_factor_secret").nullable()
      table.text("two_factor_recovery_codes").nullable()
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
