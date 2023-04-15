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

Route.group(() => {
  Route.post("/create-transaction", "TransactionsController.create");
  Route.post("/debit-user", "TransactionsController.debitUser");
  Route.patch("/update-transaction-status/:id/:userId/:status", "TransactionsController.updateStatus")
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
  Route.patch("/wallet-address", "AuthController.saveWalletAddress");
})
.prefix('/api/v0')
.middleware('auth:api');

Route.group(() => {
  Route.post("/register", "AuthController.register");
  Route.post("/login", "AuthController.login");
  Route.post("/logout", "AuthController.logout");
})
.prefix('/auth');

Route.get("/me", "AuthController.me")
.prefix("/auth")
.middleware("auth:api");
