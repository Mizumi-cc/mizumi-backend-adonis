This is an [AdonisJS](https://adonisjs.com) project bootstrapped with [`create-adonis-ts-app`](https://www.npmjs.com/package/create-adonis-ts-app)

## Getting Started

First, run the development server:
`node ace serve --watch`

Open [http://localhost:8080](http://localhost:8080) with your browser to see the result.

## Database
1. Create a postgres database and point the app to it in the .env file
2. Create a redis server and point the app to it in the .env file

## Environment variables: use `env.ts` as reference
1. Go [here](https://fincra.com) to get a Fincra account. Fincra is the payment service provider we're using to collect payments and make payouts in tradfi. Its free to create an account. Use the API keys provided in the .env file. Also enable webhooks. After deploying app, set the webhook url to the new app url in the Fincra dashboard. Like this `{new_app_url}/order/fincra-webhook`
2. The ANCHOR_PROVIDER_URL can be any devnet RPC url.
3. For the ADMIN environment variable, you can create a Solana wallet and export the Keypair in byte array format. Make sure this is the same wallet used as ADMIN in the Solana program.
4. Go [here](https://apilayer.com/marketplace/exchangerates_data-api?utm_source=apilayermarketplace&utm_medium=featured) for exchange rate APIs. Use API keys in .env
5. Mint tokens for USDC and USDT. Use mint addresses in .env file. Make sure they are the same used to initialise Solana program. Instructions [here](https://spl.solana.com/token#example-creating-your-own-fungible-token)
6. checkout env.example for values for remaining variables.
