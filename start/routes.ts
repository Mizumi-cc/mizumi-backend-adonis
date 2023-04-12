/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from "@ioc:Adonis/Core/Route";

Route.get("/", async () => {
  return { hello: "world" };
});

Route.post("/signup", "UsersController.signup");
Route.post("/update-user-information", "UsersController.updateUserInformation");
Route.post("/order/create", "TransactionsController.create");
Route.post("/order/debit", "TransactionsController.debitUser");
Route.post("/order/credit", "TransactionsController.creditUser");
Route.patch("/order/:id/:userId/:status", "TransactionsController.updateStatus")
  .where("id", {
    match: /[0-9]+/,
    cast: (id: string) => Number(id)
  })
  .where("userId", {
    match: /[0-9]+/,
    cast: (userId: string) => Number(userId)
  })
  .where("status", {
    match: /[0-9]+/,
    cast: (status: string) => Number(status)
  });
Route.get("/banks", "BankLookupController.fetchAllBanks");
