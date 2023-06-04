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
  Route.post("/order/create", "TransactionsController.create");
  Route.post("/order/debit", "TransactionsController.debitUser");
  Route.post("/order/credit", "TransactionsController.creditUser");
  Route.patch("/order/:id/:userId/:status", "TransactionsController.updateStatus")
    .where("id", {
      match: /[0-9]+/,
    })
    .where("userId", {
      match: /[0-9]+/,
    })
    .where("status", {
      match: /[0-9]+/,
      cast: (status: string) => Number(status)
    });
  Route.patch("/wallet-address", "AuthController.saveWalletAddress");
  Route.get("/order/create-user-program-account-tx/:userId", "TransactionsController.createUserProgramAccountTx")
    .where("userId", {
      match: /[0-9]+/,
    })
  Route.get("/order/by-user/:userId", "TransactionsController.fetchUserTransactions")
  Route.post("/order/complete", "TransactionsController.completeTransaction")
})
.prefix('/api/v0')
.middleware('auth:api');

Route.group(() => {
  Route.post("/register", "AuthController.register");
  Route.post("/login", "AuthController.login");
  Route.post("/logout", "AuthController.logout");
  Route.get("/is-unique", "AuthController.isUniqueUsernameOrEmail");
})
.prefix('/auth');

Route.get("/me", "AuthController.me")
.prefix("/auth")
.middleware("auth:api");

Route.get("/rates/ghs", "RatesController.getGHSToUSD");
Route.post("/order/fincra-webhook", "TransactionsController.fincraWebhook");
Route.get("/order/:id", "TransactionsController.fetchTransaction");
Route.group(() => {
  Route.post("/waitlist/join", "WaitlistsController.join").prefix("/api/v0");
  Route.get("/waitlist", "WaitlistsController.getWaitlist").prefix("/api/v0");
  Route.post("/waitlist/approve", "WaitlistsController.approve").prefix("/api/v0");
})

