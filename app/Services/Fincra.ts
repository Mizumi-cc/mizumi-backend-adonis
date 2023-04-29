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

export const initiatePayment = async (form: PaymentForm) => {
  const url = `${Env.get('FINCRA_API_URL')}/checkout-core/payments`
  return await superagent
    .post(url)
    .set('x-pub-key', Env.get('FINCRA_PK'))
    .set('api-key', Env.get('FINCRA_SK'))
    .send(form)
}


