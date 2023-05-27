import Env from "@ioc:Adonis/Core/Env";
const superagent = require('superagent');

export type PaymentForm = {
  amount: string
  redirectUrl?: string
  currency: string
  reference: string
  feeBearer: string
  metadata: {
    userId: string
  }
  customer: {
    name: string
    email: string
  }
  successMessage: string
}

export enum PAYOUTMETHOD {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money_wallet',
}

export type PayoutForm = {
  business: string
  sourceCurrency: string
  destinationCurrency: string
  amount: string
  description: string
  paymentDestination: PAYOUTMETHOD
  customerReference: string
  beneficiary: {
    firstName: string
    lastName: string
    accountHolderName: string
    country: string
    phone: string
    mobileMoneyCode: string
    accountNumber: string
    type: string
    email: string
  }
}

export const initiatePayment = async (form: PaymentForm) => {
  const url = `${Env.get('FINCRA_API_URL')}/checkout-core/payments`
  return await superagent
    .post(url)
    .set('x-pub-key', Env.get('FINCRA_PK'))
    .set('api-key', Env.get('FINCRA_SK'))
    .send(form)
}

export const initiatePayout = async (form: PayoutForm) => {
  const url = `${Env.get('FINCRA_API_URL')}/disbursements/payouts`
  return await superagent
    .post(url)
    .set('x-pub-key', Env.get('FINCRA_PK'))
    .set('api-key', Env.get('FINCRA_SK'))
    .send(form)
}
