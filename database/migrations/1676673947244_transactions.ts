import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "transactions";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid("id").primary();
      table.string("user_id");
      table.string("transaction_hash");
      table.string("fiat_transaction_id");
      table.string("payment_provider");
      table.float("fiat_amount");
      table.float("token_amount");
      table.string("token");
      table.string("fiat");
      table.integer("status");
      table.integer("kind");
      table.string("error_reason");
      table.string("country");
      table.float("rate");
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
