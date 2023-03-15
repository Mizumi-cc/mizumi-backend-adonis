import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "transactions";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");
      table.integer("user_id");
      table.string("transaction_id");
      table.string("fiat_transaction_id");
      table.string("payment_provider");
      table.integer("fiat_amount");
      table.integer("token_amount");
      table.string("token");
      table.string("fiat");
      table.string("status");
      table.string("kind");
      table.string("error_reason");
      table.string("country");
      table.integer("rate");
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("settled_date", { useTz: true });
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
